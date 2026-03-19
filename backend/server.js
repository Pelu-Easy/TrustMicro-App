require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Expo } = require('expo-server-sdk');
const os = require('os');

// --- 0. INITIALIZE APP FIRST ---
const app = express();
const expo = new Expo();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

// Helper to get local IP address dynamically
const getLocalIp = () => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
};

// --- 1. MIDDLEWARE SETUP ---
app.use(cors({ 
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], 
    allowedHeaders: ['Content-Type', 'Authorization'] 
}));
app.use(express.json());

// Import and use external loan routes
const loanRoutes = require('./routes/loanRoutes');
app.use('/api/v1/loans', loanRoutes);

app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// --- 2. DATABASE INITIALIZATION ---
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    keepAlive: true
});

db.connect((err, client, release) => {
    if (err) {
        console.error('❌ DATABASE CONNECTION ERROR:', err.message);
        return;
    }
    console.log('✅ Connected to Supabase Successfully');
    release();
});

// --- CONFIGURATION & LIMITS ---
const LOAN_LIMITS = {
    'Federal': 1000000,
    'State': 500000,
    'Private': 250000
};

const STATUS_AUTHORITY_MAP = {
    'Pending': ['head of marketing', 'supervisor', 'manager'],
    'PENDING_CREDIT': ['credit officer', 'credit staff', 'head of credit'],
    'PENDING_HEAD_CREDIT': ['head of credit'],
    'PENDING_CONTROL': ['head of control'],
    'PENDING_CCO': ['cco'],
    'PENDING_MD': ['md']
};

// --- 3. HELPER FUNCTIONS ---
const sendPushNotification = async (targetExpoToken, title, body, data = {}) => {
    if (!Expo.isExpoPushToken(targetExpoToken)) {
        console.error(`Push token ${targetExpoToken} is not a valid Expo push token`);
        return;
    }
    let messages = [{
        to: targetExpoToken,
        sound: 'default',
        title: title,
        body: body,
        data: data,
    }];
    try {
        await expo.sendPushNotificationsAsync(messages);
    } catch (error) {
        console.error("Notification delivery error:", error);
    }
};

// --- 4. AUTHENTICATION & MANAGEMENT MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && (authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader);
    
    if (!token) return res.status(401).json({ error: "Unauthorized access" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Session expired" });
        req.user = user;
        next();
    });
};

const isManagement = (req, res, next) => {
    if (!req.user) return res.status(403).json({ error: "Access Denied" });

    const role = (req.user.role || "").toLowerCase().trim();
    const unit = (req.user.unit || "").toLowerCase().trim();
    const isSupFlag = req.user.is_supervisor;

    const managementUnits = [
        'cco', 'md', 'head of credit', 'cfo', 'admin', 
        'super admin', 'manager', 'supervisor', 
        'head of marketing', 'head of control', 'credit officer',
        'credit staff', 'officer'
    ];
    
    const hasManagementAccess = 
        isSupFlag == 1 || 
        isSupFlag === true || 
        managementUnits.includes(role) ||
        managementUnits.includes(unit);

    if (hasManagementAccess) {
        next();
    } else {
        res.status(403).json({ error: "Management privileges required" });
    }
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
            return res.status(404).json({ error: "Account not found" });
        }

        if (user.is_active === false || user.failed_attempts >= 3) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: "Account Deactivated." });
        }

        const isMatch = await bcrypt.compare(password, user.password || user.password_hash);
        if (!isMatch) {
            const newCount = (user.failed_attempts || 0) + 1;
            await client.query("UPDATE staff_users SET failed_attempts = $1, is_active = $2 WHERE id = $3", [newCount, newCount < 3, user.id]);
            await client.query('COMMIT');
            return res.status(401).json({ error: "Invalid credentials" });
        }

        await client.query("UPDATE staff_users SET failed_attempts = 0, is_active = true WHERE id = $1", [user.id]);
        await client.query('COMMIT');

        const token = jwt.sign({ 
            id: user.id, email: user.email, role: user.role, 
            unit: user.unit, full_name: user.full_name,
            is_supervisor: user.is_supervisor, branch: user.branch
        }, JWT_SECRET, { expiresIn: '12h' });

        res.json({ token, user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role, unit: user.unit, branch: user.branch } });
    } catch (e) { 
        await client.query('ROLLBACK');
        res.status(500).json({ error: "Server Error" }); 
    } finally { client.release(); }
};

const handleSignup = async (req, res) => {
    const { full_name, email, phone_no, branch, password, role, supervisor_name, unit, is_loan_officer, is_supervisor } = req.body;
    try {
        if (!email || !password || !full_name) return res.status(400).json({ error: "Missing required fields" });
        const hash = await bcrypt.hash(password, 10);
        const query = `INSERT INTO staff_users (full_name, email, phone_no, password, role, branch, supervisor_name, is_active, failed_attempts, unit, is_loan_officer, is_supervisor) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`;
        const values = [full_name, email.trim().toLowerCase(), phone_no || null, hash, role || 'Officer', branch || 'Main', supervisor_name || null, true, 0, unit || 'Operations', is_loan_officer === true || is_loan_officer === 1, is_supervisor === true || is_supervisor === 1];
        await db.query(query, values);
        res.status(201).json({ message: "Staff created successfully" });
    } catch (e) { res.status(500).json({ error: "Signup failed", details: e.message }); }
};

app.post('/auth/login', handleLogin);
app.post('/api/v1/auth/login', handleLogin);
app.post('/auth/signup', handleSignup);
app.post('/api/v1/auth/signup', handleSignup);

// --- 6. IDENTITY & CUSTOMER LOGIC ---
app.post('/api/v1/verify-identity', async (req, res) => {
    const { bvn } = req.body;
    if (!bvn || bvn.length !== 11) return res.status(400).json({ status: "error", message: "Invalid BVN." });
    try {
        const mockCustomer = { firstName: "TrustMicro", lastName: "Customer", fullName: "TrustMicro Customer", bvn: bvn, verificationStatus: "VERIFIED" };
        const upsertQuery = `INSERT INTO customers (bvn, full_name, kyc_status, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) ON CONFLICT (bvn) DO UPDATE SET full_name = EXCLUDED.full_name, kyc_status = EXCLUDED.kyc_status, updated_at = CURRENT_TIMESTAMP RETURNING *;`;
        const dbResult = await db.query(upsertQuery, [mockCustomer.bvn, mockCustomer.fullName, mockCustomer.verificationStatus]);
        res.json({ status: "success", data: { ...mockCustomer, internalId: dbResult.rows[0].id } });
    } catch (e) { res.status(500).json({ error: "Database/KYC service error" }); }
});

app.post('/api/v1/manager/verify-bvn', async (req, res) => {
    const { bvn } = req.body;
    try {
        const result = await db.query('SELECT * FROM customers WHERE bvn = $1', [bvn]);
        if (result.rows.length > 0) return res.json({ status: "success", data: { fullName: result.rows[0].full_name, bvn: result.rows[0].bvn, verificationStatus: "VERIFIED" } });
        res.json({ status: "success", data: { fullName: "Verified Customer", bvn: bvn, verificationStatus: "VERIFIED" } });
    } catch (e) { res.status(500).json({ error: "Service Unavailable" }); }
});

app.get('/api/v1/manager/customers', authenticateToken, isManagement, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM customers ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: "Failed to fetch customers" }); }
});

app.get('/api/v1/manager/customer-loans/:bvn', authenticateToken, isManagement, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM loans WHERE bvn = $1 ORDER BY "submittedDate" DESC', [req.params.bvn]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: "Failed to fetch loan history" }); }
});

// --- 7. NOTIFICATIONS ---
app.post('/api/v1/user/update-push-token', authenticateToken, async (req, res) => {
    try {
        await db.query('UPDATE staff_users SET push_token = $1 WHERE id = $2', [req.body.pushToken, req.user.id]);
        res.json({ message: "Push token updated" });
    } catch (err) { res.status(500).json({ error: "Failed token update" }); }
});

app.get('/api/v1/notifications', authenticateToken, async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM notification_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20", [req.user.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: "Failed to load notifications" }); }
});

app.get('/api/v1/notifications/unread-count', authenticateToken, async (req, res) => {
    try {
        const result = await db.query("SELECT COUNT(*) FROM notification_history WHERE user_id = $1 AND is_read = false", [req.user.id]);
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (err) { res.json({ count: 0 }); }
});

// --- 8. MANAGER WORKFLOW ROUTES (UPDATED FOR CREDIT STAFF LOAD BALANCING) ---
app.patch('/api/v1/manager/update-status/:id', authenticateToken, isManagement, async (req, res) => {
    const { status, rejection_reason } = req.body; 
    const userRole = (req.user.role || "").toLowerCase().trim();
    
    try {
        const loanCheck = await db.query('SELECT status, "customerName", "createdByEmail", "assignedCreditStaffId" FROM loans WHERE id = $1', [req.params.id]);
        if (loanCheck.rowCount === 0) return res.status(404).json({ error: "Loan not found" });
        
        const currentStatus = loanCheck.rows[0].status;
        const authorizedRoles = STATUS_AUTHORITY_MAP[currentStatus] || [];

        if (status !== 'Rejected' && !authorizedRoles.includes(userRole) && !['admin', 'super admin'].includes(userRole)) {
            return res.status(403).json({ error: `Not authorized for '${currentStatus}' stage.` });
        }

        let assignedStaffId = loanCheck.rows[0].assignedCreditStaffId;

        // SMART ROUTING: If moving to Credit, find the least busy Credit Staff member
        if (status === 'PENDING_CREDIT') {
            const staffFinderQuery = `
                SELECT u.id, u.push_token, COUNT(l.id) as active_count
                FROM staff_users u
                LEFT JOIN loans l ON u.id = l."assignedCreditStaffId" AND l.status = 'PENDING_CREDIT'
                WHERE (LOWER(u.role) = 'credit staff' OR LOWER(u.role) = 'credit officer')
                AND u.is_active = true
                GROUP BY u.id, u.push_token
                ORDER BY active_count ASC
                LIMIT 1
            `;
            const staffResult = await db.query(staffFinderQuery);
            if (staffResult.rows.length > 0) {
                assignedStaffId = staffResult.rows[0].id;
                
                // Notify the assigned Credit Staff
                const title = "New Loan Assigned 📝";
                const body = `You have been assigned the loan for ${loanCheck.rows[0].customerName}.`;
                await db.query("INSERT INTO notification_history (user_id, title, body) VALUES ($1, $2, $3)", [assignedStaffId, title, body]);
                if (staffResult.rows[0].push_token) sendPushNotification(staffResult.rows[0].push_token, title, body, { loanId: req.params.id, type: 'ASSIGNMENT' });
            }
        }

        const result = await db.query(
            'UPDATE loans SET status = $1, rejection_reason = $2, "assignedCreditStaffId" = $3 WHERE id = $4 RETURNING *', 
            [status, rejection_reason || null, assignedStaffId, req.params.id]
        );
        
        const updatedLoan = result.rows[0];

        // Notify original creator of the update
        const creatorRes = await db.query("SELECT id, push_token FROM staff_users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))", [updatedLoan.createdByEmail]);
        if (creatorRes.rows[0]) {
            const staff = creatorRes.rows[0];
            const title = `Loan Update: ${status.replace(/_/g, ' ')}`;
            const body = `The loan for ${updatedLoan.customerName} has moved to ${status.replace(/_/g, ' ')}.`;
            if (staff.push_token) sendPushNotification(staff.push_token, title, body, { loanId: updatedLoan.id, type: 'STATUS_UPDATE' });
        }

        res.json({ message: "Status updated", loan: updatedLoan });
    } catch (err) { 
        console.error("Update failed:", err.message);
        res.status(500).json({ error: "Update failed" }); 
    }
});

app.get('/api/v1/manager/all-loans', authenticateToken, isManagement, async (req, res) => {
    const userRole = (req.user.role || "").toLowerCase().trim();
    const userUnit = (req.user.unit || "").toLowerCase().trim();
    const userId = req.user.id;
    const userBranch = req.user.branch;

    try {
        const hqRoles = ['super admin', 'admin', 'cco', 'md', 'head of credit', 'head of control', 'head of marketing'];
        const isHQAccess = hqRoles.includes(userRole) || hqRoles.includes(userUnit);

        // EXPLICIT SELECT to ensure all Image URLs are returned to the frontend
        let query = `
            SELECT l.*, 
            s.full_name as "staffName", 
            s.branch as "branchName" 
            FROM loans l 
            LEFT JOIN staff_users s ON LOWER(TRIM(l."createdByEmail")) = LOWER(TRIM(s.email))`;
        
        let params = [];

        // If Credit Staff or Credit Officer, only show loans specifically assigned to them
        if (userRole === 'credit staff' || userRole === 'credit officer') {
            query += ` WHERE l."assignedCreditStaffId" = $1`;
            params = [userId];
        } else if (!isHQAccess) {
            query += ` WHERE s.branch = $1`;
            params = [userBranch];
        }
        
        query += ` ORDER BY l."submittedDate" DESC`;

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) { 
        console.error("❌ ALL-LOANS FETCH ERROR:", err.message);
        res.status(500).json({ error: "Failed to fetch loans" }); 
    }
});

app.get('/api/v1/manager/approved-loans', authenticateToken, isManagement, async (req, res) => {
    try {
        const result = await db.query("SELECT l.*, s.full_name as \"staffName\" FROM loans l LEFT JOIN staff_users s ON LOWER(TRIM(l.\"createdByEmail\")) = LOWER(TRIM(s.email)) WHERE l.status = 'Approved' ORDER BY l.\"submittedDate\" DESC");
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: "Failed to fetch approved loans" }); }
});

app.get('/api/v1/manager/staff-list', authenticateToken, isManagement, async (req, res) => {
    try {
        const result = await db.query('SELECT id, full_name, email, role, unit, branch, is_active FROM staff_users ORDER BY full_name ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: "Failed to fetch staff" }); }
});

app.get('/api/v1/manager/supervisors', async (req, res) => {
    try {
        const query = `SELECT id, full_name, email, role, branch FROM staff_users WHERE is_active = true AND (is_supervisor = true OR role ILIKE '%Manager%' OR role ILIKE '%Admin%' OR role ILIKE '%Supervisor%' OR unit IN ('Head of Credit', 'CCO', 'MD', 'CFO', 'Supervisor', 'Operations')) ORDER BY full_name ASC`;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: "Failed to load supervisors" }); }
});

// --- 9. LOAN SUBMISSION ---
app.post('/api/v1/loans', authenticateToken, async (req, res) => {
    const tokenEmail = req.user.email.trim().toLowerCase();
    const loan = req.body;
    const requestedAmount = parseFloat(loan.loanAmount || 0);
    const limit = LOAN_LIMITS[loan.loanType] || 250000;
    if (requestedAmount > limit) return res.status(400).json({ error: `Limit exceeded` });
    try {
        const staffRes = await db.query("SELECT supervisor_name FROM staff_users WHERE LOWER(TRIM(email)) = $1", [tokenEmail]);
        const supervisorName = staffRes.rows[0]?.supervisor_name;
        
        const query = `INSERT INTO loans ("id", "customerName", "bvn", "nin", "phone", "loanAmount", "amount", "status", "createdByEmail", "submittedDate", "bankName", "accountNumber", "employerName", "ninImageUrl", "idImageUrl", "passportImageUrl", "utilityBillUrl", "workIdUrl", "statementUrl", "signatureUrl", "monthlyIncome", "loanType", "repaymentCycle", "gender") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`;
        
        const values = [
            `LOAN-${Date.now()}`, loan.customerName, loan.bvn, loan.nin, loan.phone, requestedAmount, requestedAmount, 'Pending', 
            tokenEmail, new Date().toISOString().split('T')[0], loan.bankName, loan.accountNumber, loan.employerName || 'N/A', 
            loan.ninImageUrl, loan.idImageUrl, loan.passportImageUrl, loan.utilityBillUrl, loan.workIdUrl, loan.statementUrl, 
            loan.signatureUrl, loan.monthlyIncome, loan.loanType, loan.repaymentCycle, loan.gender
        ];

        await db.query(query, values);

        if (supervisorName) {
            const supRes = await db.query("SELECT id, push_token FROM staff_users WHERE LOWER(TRIM(full_name)) = LOWER(TRIM($1))", [supervisorName]);
            if (supRes.rows[0]) {
                const staff = supRes.rows[0];
                await db.query("INSERT INTO notification_history (user_id, title, body) VALUES ($1, $2, $3)", [staff.id, "New Loan!", `Review needed for ${loan.customerName}`]);
                if (staff.push_token) sendPushNotification(staff.push_token, "New Loan Application!", `Review needed for ${loan.customerName}`);
            }
        }
        res.status(201).json({ message: "Loan Submitted" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/v1/loans', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM loans WHERE "createdByEmail" = $1', [req.user.email.trim().toLowerCase()]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: "Database error" }); }
});

app.get('/api/v1/users/me', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT id, full_name, email, role, unit, branch FROM staff_users WHERE id = $1', [req.user.id]);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: "Sync failed" }); }
});

app.get('/', (req, res) => res.send("🚀 TrustMicro API Live"));

const CURRENT_IP = getLocalIp();
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API LIVE on http://${CURRENT_IP}:${PORT}`);
});

module.exports = { db };