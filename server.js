require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Expo } = require('expo-server-sdk');
const os = require('os');
const fs = require('fs'); 
const path = require('path'); 

// --- 0. INITIALIZE APP FIRST ---
const app = express();
const expo = new Expo();
const PORT = process.env.PORT || 5000;

// --- CRITICAL SECURITY CHECK ---
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error("❌ [CRITICAL ERROR] JWT_SECRET is missing from .env!");
    process.exit(1); 
}

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

app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// --- 2. DATABASE INITIALIZATION ---
const db = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
});
// const db = new Pool({
//     connectionString: process.env.DATABASE_URL,
//     ssl: { rejectUnauthorized: false },
//     max: 20, 
//     idleTimeoutMillis: 30000,
//     connectionTimeoutMillis: 30000, 
//     keepAlive: true
// });

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
    'SME/Business Loans': 1000000,
    'Micro Loans': 500000,
    'Salary Advance': 250000,
    'Personal/Consumer Loans': 500000,
    'Federal': 1000000,
    'State': 500000,
    'Private': 250000
};

const STATUS_AUTHORITY_MAP = {
    'PENDING': ['head of marketing', 'supervisor', 'manager'],
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
    
    if (!token) {
        return res.status(401).json({ error: "Unauthorized access" });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            const isExpired = err.name === 'TokenExpiredError';
            return res.status(403).json({ 
                error: isExpired ? "Session expired" : "Invalid session",
                expiredAt: err.expiredAt || null 
            });
        }
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
        'credit staff', 'officer', 'sales', 'marketing'
    ];
    
    const hasManagementAccess = 
        isSupFlag == 1 || 
        isSupFlag === true || 
        managementUnits.includes(role) ||
        managementUnits.includes(unit) ||
        role.includes('manager') || 
        role.includes('supervisor');

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
            id: user.id, 
            email: user.email, 
            role: user.role, 
            unit: user.unit, 
            full_name: user.full_name,
            is_supervisor: user.is_supervisor, 
            branch: user.branch,
            department: user.department 
        }, JWT_SECRET, { expiresIn: '24h' });

        res.json({ 
            token, 
            user: { 
                id: user.id, 
                full_name: user.full_name, 
                email: user.email, 
                role: user.role, 
                unit: user.unit, 
                branch: user.branch,
                department: user.department 
            } 
        });
    } catch (e) { 
        await client.query('ROLLBACK');
        res.status(500).json({ error: "Server Error" }); 
    } finally { client.release(); }
};

const handleSignup = async (req, res) => {
    const { 
        full_name, fullName, email, phone_no, phone, branch, password, 
        role, supervisor_name, supervisor, unit, department, 
        is_loan_officer, is_supervisor 
    } = req.body;

    try {
        const finalFullName = full_name || fullName;
        const finalEmail = email?.trim().toLowerCase();
        if (!finalEmail || !password || !finalFullName) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const hash = await bcrypt.hash(password, 10);
        const query = `INSERT INTO staff_users (full_name, email, phone_no, password, role, branch, supervisor_name, is_active, failed_attempts, unit, is_loan_officer, is_supervisor, department) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`;
        
        const values = [
            finalFullName, finalEmail, phone_no || phone || null, hash, 
            role || 'Officer', branch || 'Main Headquarters', 
            supervisor_name || supervisor || 'N/A', true, 0, unit || 'Operations', 
            is_loan_officer === true || is_loan_officer === 1, 
            is_supervisor === true || is_supervisor === 1, department || 'General'
        ];

        await db.query(query, values);
        res.status(201).json({ message: "Staff created successfully" });
    } catch (e) { 
        res.status(500).json({ error: "Signup failed", details: e.message }); 
    }
};

app.post('/api/v1/auth/login', handleLogin);
app.post('/api/v1/auth/signup', handleSignup);

// --- 6. IDENTITY & CUSTOMER LOGIC (DYNAMIC MOCK LOOKUP) ---

app.post('/api/v1/manager/verify-bvn', authenticateToken, async (req, res) => {
    const { bvn } = req.body;
    
    if (!bvn || bvn.length !== 11) {
        return res.status(400).json({ status: "error", message: "Invalid BVN length. Must be 11 digits." });
    }

    try {
        const mockFilePath = path.join(__dirname, 'mock_identity.json');
        
        if (!fs.existsSync(mockFilePath)) {
            console.error("❌ [File Error] mock_identity.json not found at:", mockFilePath);
            return res.status(500).json({ status: "error", message: "Server mock identity store missing." });
        }

        // Read and parse mock identities dynamically
        const rawData = fs.readFileSync(mockFilePath, 'utf8');
        const identities = JSON.parse(rawData);
        
        // Find user by matching BVN string
        const matchedUser = identities.find(user => user.bvn === bvn.trim());

        if (!matchedUser) {
            return res.status(404).json({ status: "error", message: "BVN verification failed. Record not found." });
        }

        // Split full name cleanly into firstName and lastName for the frontend UI
        const nameParts = matchedUser.fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        const mockCustomer = { 
            firstName: firstName, 
            lastName: lastName, 
            fullName: matchedUser.fullName, 
            bvn: matchedUser.bvn, 
            verificationStatus: "VERIFIED" 
        };

        // Sync valid record into Supabase customer register
        await db.query(`
            INSERT INTO customers (bvn, full_name, kyc_status, updated_at) 
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP) 
            ON CONFLICT (bvn) 
            DO UPDATE SET kyc_status = EXCLUDED.kyc_status, updated_at = CURRENT_TIMESTAMP
        `, [matchedUser.bvn, matchedUser.fullName, 'VERIFIED']);

        res.json({ status: "success", data: mockCustomer });
    } catch (e) {
        console.error("BVN Verification Error:", e);
        res.status(500).json({ error: "Internal Server Error during verification" });
    }
});

app.post('/api/v1/verify-identity', async (req, res) => {
    const { bvn } = req.body;
    if (!bvn || bvn.length !== 11) return res.status(400).json({ status: "error", message: "Invalid BVN." });
    
    try {
        const mockFilePath = path.join(__dirname, 'mock_identity.json');
        const rawData = fs.readFileSync(mockFilePath, 'utf8');
        const identities = JSON.parse(rawData);
        
        const matchedUser = identities.find(user => user.bvn === bvn.trim());

        if (!matchedUser) {
            return res.status(404).json({ status: "error", message: "Identity validation failed. Record not found." });
        }

        const nameParts = matchedUser.fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        const mockCustomer = { 
            firstName: firstName, 
            lastName: lastName, 
            fullName: matchedUser.fullName, 
            bvn: matchedUser.bvn, 
            verificationStatus: "VERIFIED" 
        };

        await db.query(`
            INSERT INTO customers (bvn, full_name, kyc_status, updated_at) 
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP) 
            ON CONFLICT (bvn) 
            DO UPDATE SET kyc_status = EXCLUDED.kyc_status, updated_at = CURRENT_TIMESTAMP
        `, [matchedUser.bvn, matchedUser.fullName, 'VERIFIED']);
        
        res.json({ status: "success", data: mockCustomer });
    } catch (e) { 
        res.status(500).json({ error: "Service error" }); 
    }
});

// --- 7. LOAN SUBMISSION (FIXED STATUS & EMAILS) ---
// --- 7. LOAN SUBMISSION (DEFENSIVE FIX FOR LOAN TYPE) ---
app.post('/api/v1/loans', authenticateToken, async (req, res) => {
    const tokenEmail = req.user.email.trim().toLowerCase();
    const loan = req.body;
    
    // Defensive check: Catch variations in frontend naming conventions
    const componentsLoanType = loan.loanType || loan.loan_type || loan.category || loan.type;
    const requestedAmount = parseFloat(loan.loanAmount || loan.amount || 0);

    if (!componentsLoanType) {
        return res.status(400).json({ error: "Missing required field: loanType" });
    }

    const limit = LOAN_LIMITS[componentsLoanType] || 250000;

    if (requestedAmount > limit) {
        return res.status(400).json({ 
            error: `Limit exceeded for ${componentsLoanType}. Maximum allowed is ₦${limit.toLocaleString()}` 
        });
    }
    
    try {
        const staffRes = await db.query("SELECT supervisor_name FROM staff_users WHERE email = $1", [tokenEmail]);
        const supervisorNameFromStaff = staffRes.rows[0]?.supervisor_name;
        
        const query = `
            INSERT INTO loans (
                "id", "customerName", "bvn", "nin", "phone", "loanAmount", "amount", "status", 
                "createdByEmail", "submittedDate", "bankName", "accountNumber", "employerName", 
                "ninImageUrl", "idImageUrl", "passportImageUrl", "utilityBillUrl", "workIdUrl", 
                "statementUrl", "signatureUrl", "monthlyIncome", "loanType", "repaymentCycle", 
                "gender", "supervisor_name", "stateOfOrigin", "lga", "permanentState", 
                "residentialLga", "fullAddress", "nearestLandmark", "residentialStatus", 
                "dateMovedIn", "employerState", "employerLga", "employerAddress", 
                "employmentType", "salaryRange", "annualIncome", "nextOfKinName", 
                "nextOfKinRelationship", "nextOfKinPhone", "nextOfKinAddress", "nok1State", "nok1Lga"
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 
                $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, 
                $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45
            )`;
        
        const values = [
            loan.id || `LOAN-${Date.now()}`, loan.customerName, loan.bvn, loan.nin, loan.phone, 
            requestedAmount, requestedAmount, 'PENDING', tokenEmail, 
            new Date().toISOString().split('T')[0], loan.bankName, loan.accountNumber, 
            loan.employerName || 'N/A', loan.ninImageUrl, loan.idImageUrl, 
            loan.passportImageUrl, loan.utilityBillUrl, loan.workIdUrl, 
            loan.statementUrl, loan.signatureUrl, loan.monthlyIncome, 
            componentsLoanType, loan.repaymentCycle, loan.gender, 
            (loan.supervisorName || supervisorNameFromStaff), 
            loan.stateOfOrigin, loan.lga, loan.permanentState, loan.residentialLga, 
            loan.fullAddress, loan.nearestLandmark, loan.residentialStatus, 
            loan.dateMovedIn, loan.employerState, loan.employerLga, 
            loan.employerAddress, loan.employmentType, loan.salaryRange, 
            loan.annualIncome, loan.nextOfKinName, loan.nextOfKinRelationship, 
            loan.nextOfKinPhone, loan.nextOfKinAddress, loan.nok1State, loan.nok1Lga
        ];

        await db.query(query, values);
        res.status(201).json({ message: "Loan Submitted Successfully" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 8. LOAN RETRIEVAL (FIXED FILTERING LOGIC) ---
app.get('/api/v1/loans', authenticateToken, async (req, res) => {
    const role = (req.user.role || "").toLowerCase().trim();
    const email = req.user.email.trim().toLowerCase();
    const branch = req.user.branch;

    try {
        let query = `
            SELECT l.*, s.full_name as "staffName", s.branch as "branchName" 
            FROM loans l
            LEFT JOIN staff_users s ON LOWER(TRIM(l."createdByEmail")) = LOWER(TRIM(s.email))
        `;
        let params = [];

        const hqRoles = ['admin', 'super admin', 'cco', 'md', 'head of credit', 'head of control', 'head of marketing'];
        
        if (hqRoles.includes(role)) {
            // HQ can see everything
            query += ' ORDER BY l."submittedDate" DESC';
        } else if (role === 'manager' || role === 'supervisor') {
            // Managers see their branch PLUS any "system" records assigned to their branch logic
            query += ` WHERE s.branch = $1 OR LOWER(TRIM(l."createdByEmail")) = 'system@trustmicro.com'`;
            params = [branch];
            query += ' ORDER BY l."submittedDate" DESC';
        } else {
            // Field officers only see their own
            query += ' WHERE LOWER(TRIM(l."createdByEmail")) = $1';
            params = [email];
            query += ' ORDER BY l."submittedDate" DESC';
        }

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) { 
        res.status(500).json({ error: "Database error" }); 
    }
});

// --- 9. MANAGER UPDATE STATUS ---
app.patch('/api/v1/manager/update-status/:id', authenticateToken, isManagement, async (req, res) => {
    const { status, rejection_reason } = req.body; 
    const normalizedStatus = status.toUpperCase();
    
    try {
        await db.query(
            'UPDATE loans SET status = $1, rejection_reason = $2 WHERE id = $3', 
            [normalizedStatus, rejection_reason || null, req.params.id]
        );
        res.json({ message: "Status updated" });
    } catch (err) { res.status(500).json({ error: "Update failed" }); }
});

app.get('/api/v1/users/me', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT id, full_name, email, role, unit, branch FROM staff_users WHERE id = $1', [req.user.id]);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: "Sync failed" }); }
});

// --- MISSING NOTIFICATION ROUTE ---
app.get('/api/v1/notifications/unread-count', authenticateToken, async (req, res) => {
    try {
        const email = req.user.email.trim().toLowerCase();
        // This counts pending loans assigned to the user or their branch
        const result = await db.query(
            'SELECT COUNT(*) FROM loans WHERE "createdByEmail" = $1 AND status = $2',
            [email, 'PENDING']
        );
        res.json({ count: parseInt(result.rows[0].count) || 0 });
    } catch (err) {
        console.error("Notification Error:", err);
        res.status(500).json({ error: "Failed to fetch notifications" });
    }
});

app.get('/', (req, res) => res.send("🚀 TrustMicro API Live"));

const CURRENT_IP = getLocalIp();
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API LIVE on http://${CURRENT_IP}:${PORT}`);
});

module.exports = { db };