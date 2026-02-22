require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Expo } = require('expo-server-sdk'); // Import Expo SDK

const app = express();
const expo = new Expo(); // Initialize Expo
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

// --- CONFIGURATION & LIMITS ---
const LOAN_LIMITS = {
    'Federal': 1000000,
    'State': 500000,
    'Private': 250000
};

// --- 1. MIDDLEWARE SETUP ---
app.use(cors({ 
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], 
    allowedHeaders: ['Content-Type', 'Authorization'] 
}));
app.use(express.json());

// Log requests for debugging production traffic
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// --- 2. DATABASE INITIALIZATION ---
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// --- 3. HELPER FUNCTIONS ---
const sendPushNotification = async (targetExpoToken, title, body) => {
    if (!Expo.isExpoPushToken(targetExpoToken)) {
        console.error(`Push token ${targetExpoToken} is not a valid Expo push token`);
        return;
    }
    let messages = [{
        to: targetExpoToken,
        sound: 'default',
        title: title,
        body: body,
    }];
    try {
        await expo.sendPushNotificationsAsync(messages);
    } catch (error) {
        console.error("Notification delivery error:", error);
    }
};

// --- 4. AUTHENTICATION MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && (authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader);
    
    if (!token) return res.status(401).json({ error: "Unauthorized access" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.log(`[AUTH ERROR] JWT Verification failed: ${err.message}`);
            return res.status(403).json({ error: "Session expired or invalid" });
        }
        req.user = user;
        next();
    });
};

// --- 5. AUTH & SECURITY ---

const handleLogin = async (req, res) => {
    const { email, password } = req.body;
    const cleanEmail = email?.trim().toLowerCase();
    const client = await db.connect();
    
    try {
        await client.query('BEGIN');
        const result = await client.query("SELECT * FROM staff_users WHERE LOWER(TRIM(email)) = $1", [cleanEmail]);
        const user = result.rows[0];

        if (!user) {
            await client.query('ROLLBACK');
            return res.status(404).json({ 
                error: "This account does not exist. Please Sign Up.",
                code: "USER_NOT_FOUND" 
            });
        }

        if (user.is_active === false || user.failed_attempts >= 3) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: "Account Deactivated. Contact Admin." });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            const newCount = (user.failed_attempts || 0) + 1;
            const stillActive = newCount < 3;
            await client.query("UPDATE staff_users SET failed_attempts = $1, is_active = $2 WHERE id = $3", [newCount, stillActive, user.id]);
            await client.query('COMMIT');
            
            if (!stillActive) return res.status(403).json({ error: "Too many failed attempts. Account locked." });
            return res.status(401).json({ error: `Invalid credentials. ${3 - newCount} attempts left.` });
        }

        await client.query("UPDATE staff_users SET failed_attempts = 0, is_active = true WHERE id = $1", [user.id]);
        await client.query('COMMIT');

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, full_name: user.full_name }, JWT_SECRET, { expiresIn: '12h' });
        res.json({ token, user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role, branch: user.branch } });
    } catch (e) { 
        await client.query('ROLLBACK');
        res.status(500).json({ error: "Internal Server Error" }); 
    } finally { client.release(); }
};

const handleSignup = async (req, res) => {
    const { full_name, email, phone_no, branch, password, role, supervisor_name } = req.body;
    
    try {
        const hash = await bcrypt.hash(password, 10);
        const query = `
            INSERT INTO staff_users (
                full_name, email, phone_no, password_hash, 
                role, branch, supervisor_name, is_active, failed_attempts
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;
        
        await db.query(query, [
            full_name, 
            email.trim().toLowerCase(), 
            phone_no, 
            hash, 
            role || 'Officer', 
            branch, 
            supervisor_name, 
            true, 
            0
        ]);

        res.status(201).json({ message: "Staff created successfully" });
    } catch (e) { 
        console.error("Signup error:", e.message);
        res.status(500).json({ error: "Signup failed" }); 
    }
};

app.post('/auth/login', handleLogin);
app.post('/api/v1/auth/login', handleLogin);
app.post('/auth/signup', handleSignup);
app.post('/api/v1/auth/signup', handleSignup);

app.post('/api/v1/auth/deactivate', async (req, res) => {
    const { email } = req.body;
    try {
        await db.query("UPDATE staff_users SET is_active = false, failed_attempts = 3 WHERE LOWER(TRIM(email)) = $1", [email?.trim().toLowerCase()]);
        res.json({ message: "Account locked successfully" });
    } catch (e) { res.status(500).json({ error: "Lockout failed" }); }
});

// --- 6. PUSH NOTIFICATION TOKEN UPDATE ---
app.post('/api/v1/user/update-push-token', authenticateToken, async (req, res) => {
    const { pushToken } = req.body;
    try {
        await db.query('UPDATE staff_users SET push_token = $1 WHERE id = $2', [pushToken, req.user.id]);
        res.json({ message: "Push token updated" });
    } catch (err) {
        res.status(500).json({ error: "Failed to save push token" });
    }
});

// --- 7. NOTIFICATION HISTORY ROUTES ---
app.get('/api/v1/notifications', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            "SELECT * FROM notification_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20",
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to load notifications" });
    }
});

// Get count of unread notifications
app.get('/api/v1/notifications/unread-count', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            "SELECT COUNT(*) FROM notification_history WHERE user_id = $1 AND is_read = false",
            [req.user.id]
        );
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch count" });
    }
});

// Mark all as read (call this when opening the Notification Screen)
app.patch('/api/v1/notifications/mark-read', authenticateToken, async (req, res) => {
    try {
        await db.query(
            "UPDATE notification_history SET is_read = true WHERE user_id = $1",
            [req.user.id]
        );
        res.json({ message: "Notifications marked as read" });
    } catch (err) {
        res.status(500).json({ error: "Failed to update status" });
    }
});
// --- 8. MANAGER DASHBOARD ROUTES ---

app.patch('/api/v1/manager/update-status/:id', authenticateToken, async (req, res) => {
    const { status } = req.body;
    try {
        const result = await db.query('UPDATE loans SET status = $1 WHERE id = $2 RETURNING *', [status, req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: "Loan not found" });
        res.json({ message: "Status updated" });
    } catch (err) { res.status(500).json({ error: "Update failed" }); }
});

app.get('/api/v1/manager/all-loans', authenticateToken, async (req, res) => {
    const supervisorName = req.user.full_name; 
    const userRole = req.user.role?.toLowerCase();

    try {
        let query;
        let params = [];

        if (userRole === 'super admin' || userRole === 'admin') {
            query = `
                SELECT l.*, s.full_name as "staffName", s.branch as "branchName"
                FROM loans l
                LEFT JOIN staff_users s ON LOWER(TRIM(l."createdByEmail")) = LOWER(TRIM(s.email))
                ORDER BY l."submittedDate" DESC`;
        } else {
            query = `
                SELECT l.*, s.full_name as "staffName", s.branch as "branchName"
                FROM loans l
                INNER JOIN staff_users s ON LOWER(TRIM(l."createdByEmail")) = LOWER(TRIM(s.email))
                WHERE LOWER(TRIM(s.supervisor_name)) = LOWER(TRIM($1))
                ORDER BY l."submittedDate" DESC`;
            params = [supervisorName];
        }

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error("Filter error:", err.message);
        res.status(500).json({ error: "Failed to fetch filtered loans" });
    }
});

app.get('/api/v1/manager/staff-list', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT id, full_name, email, phone_no, role, branch, is_active FROM staff_users ORDER BY full_name ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: "Failed to fetch staff" }); }
});

app.post('/api/v1/manager/reactivate-staff', authenticateToken, async (req, res) => {
    const { staffEmail } = req.body;
    try {
        await db.query('UPDATE staff_users SET is_active = true, failed_attempts = 0 WHERE LOWER(TRIM(email)) = $1', [staffEmail.trim().toLowerCase()]);
        res.json({ message: "Reactivated" });
    } catch (err) { res.status(500).json({ error: "Reactivation failed" }); }
});

const handleGetSupervisors = async (req, res) => {
    try {
        const query = `
            SELECT id, full_name, email, role, branch 
            FROM staff_users 
            WHERE role ILIKE 'Manager' OR role ILIKE 'Admin' OR role ILIKE 'Super Admin'
            ORDER BY full_name ASC`;
        
        const result = await db.query(query);
        res.json(result.rows || []);
    } catch (err) {
        console.error("Supervisor fetch error:", err.message);
        res.status(500).json({ error: "Failed to load supervisors" });
    }
};

app.get('/api/v1/manager/supervisors', handleGetSupervisors);
app.get('/manager/supervisors', handleGetSupervisors);

// --- 9. LOAN & USER ROUTES ---

app.post('/api/v1/loans', authenticateToken, async (req, res) => {
    const tokenEmail = req.user.email.trim().toLowerCase();
    const loan = req.body;
    const uniqueId = `LOAN-${Date.now()}`;

    const requestedAmount = parseFloat(loan.loanAmount || 0);
    const selectedType = loan.loanType || 'Private';
    const limit = LOAN_LIMITS[selectedType] || 250000;

    if (requestedAmount > limit) {
        return res.status(400).json({ 
            error: `Validation Error: Maximum amount for ${selectedType} loans is ₦${limit.toLocaleString()}` 
        });
    }

    try {
        // Find supervisor's info
        const staffRes = await db.query("SELECT supervisor_name FROM staff_users WHERE LOWER(TRIM(email)) = $1", [tokenEmail]);
        const supervisorName = staffRes.rows[0]?.supervisor_name;

        const query = `
            INSERT INTO loans (
                "id", "customerName", "bvn", "nin", "phone", "loanAmount", "amount", "status", 
                "createdByEmail", "submittedDate", "bankName", "accountNumber", "employerName",
                "ninImageUrl", "idImageUrl", "passportImageUrl", "utilityBillUrl", 
                "workIdUrl", "statementUrl", "signatureUrl",
                "monthlyIncome", "loanType", "repaymentCycle", "gender"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`;
        
        const values = [
            uniqueId, loan.customerName, loan.bvn, loan.nin, loan.phone, requestedAmount, requestedAmount, 
            'Pending', tokenEmail, new Date().toISOString().split('T')[0], loan.bankName, loan.accountNumber, 
            loan.employerName || 'N/A', loan.ninImageUrl, loan.idImageUrl, loan.passportImageUrl, loan.utilityBillUrl, 
            loan.workIdUrl, loan.statementUrl, loan.signatureUrl, loan.monthlyIncome, loan.loanType, loan.repaymentCycle, loan.gender
        ];

        await db.query(query, values);

        // TRIGGER NOTIFICATION & SAVE TO HISTORY
        if (supervisorName) {
            const supervisor = await db.query(
                "SELECT id, push_token FROM staff_users WHERE LOWER(TRIM(full_name)) = LOWER(TRIM($1))", 
                [supervisorName]
            );

            if (supervisor.rows[0]) {
                const title = "New Loan Application! 💸";
                const body = `A new loan for ${loan.customerName} requires your approval.`;
                const supervisorId = supervisor.rows[0].id;
                const pushToken = supervisor.rows[0].push_token;

                // Save to History Table
                await db.query(
                    "INSERT INTO notification_history (user_id, title, body) VALUES ($1, $2, $3)",
                    [supervisorId, title, body]
                );

                // Send the actual Ping if token exists
                if (pushToken) {
                    sendPushNotification(pushToken, title, body);
                }
            }
        }

        res.status(201).json({ message: "Loan Submitted" });
    } catch (err) { 
        console.error("Database Insert Error:", err.message);
        res.status(500).json({ error: err.message }); 
    }
});

app.get('/api/v1/loans', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM loans WHERE "createdByEmail" = $1', [req.user.email.trim().toLowerCase()]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: "Database error." }); }
});

app.get('/api/v1/users/me', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT id, full_name, email, role, branch FROM staff_users WHERE id = $1', [req.user.id]);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: "Sync failed" }); }
});

app.get('/api/v1/manager/my-team', authenticateToken, async (req, res) => {
    const supervisorName = req.user.full_name; 
    try {
        const query = `
            SELECT id, full_name, email, phone_no, branch, unit, is_active
            FROM staff_users
            WHERE LOWER(TRIM(supervisor_name)) = LOWER(TRIM($1))
            ORDER BY full_name ASC`;
        const result = await db.query(query, [supervisorName]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: "Failed to load team members" }); }
});

app.get('/', (req, res) => res.send("🚀 TrustMicro API Live"));
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Port ${PORT}`));