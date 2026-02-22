require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
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

// --- 3. AUTHENTICATION MIDDLEWARE ---
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

// --- 4. AUTH & SECURITY ---

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

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
        res.json({ token, user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role, branch: user.branch } });
    } catch (e) { 
        await client.query('ROLLBACK');
        res.status(500).json({ error: "Internal Server Error" }); 
    } finally { client.release(); }
};

const handleSignup = async (req, res) => {
    const { full_name, email, phone_no, branch, password, role } = req.body;
    try {
        const hash = await bcrypt.hash(password, 10);
        await db.query(`INSERT INTO staff_users (full_name, email, phone_no, password_hash, role, branch, is_active, failed_attempts) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, 
        [full_name, email.trim().toLowerCase(), phone_no, hash, role || 'Officer', branch, true, 0]);
        res.status(201).json({ message: "Staff created" });
    } catch (e) { 
        console.error("Signup error:", e.message);
        res.status(500).json({ error: "Signup failed" }); 
    }
};

// Public Routes (No authenticateToken)
app.post('/auth/login', handleLogin);
app.post('/api/v1/auth/login', handleLogin);
app.post('/auth/signup', handleSignup);
app.post('/api/v1/auth/signup', handleSignup);

// Account Lockout (Also public so login screen can call it on 3 strikes)
app.post('/api/v1/auth/deactivate', async (req, res) => {
    const { email } = req.body;
    try {
        await db.query("UPDATE staff_users SET is_active = false, failed_attempts = 3 WHERE LOWER(TRIM(email)) = $1", [email?.trim().toLowerCase()]);
        res.json({ message: "Account locked successfully" });
    } catch (e) { res.status(500).json({ error: "Lockout failed" }); }
});

// --- 5. MANAGER DASHBOARD ROUTES ---

app.patch('/api/v1/manager/update-status/:id', authenticateToken, async (req, res) => {
    const { status } = req.body;
    try {
        const result = await db.query('UPDATE loans SET status = $1 WHERE id = $2 RETURNING *', [status, req.params.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: "Loan not found" });
        res.json({ message: "Status updated" });
    } catch (err) { res.status(500).json({ error: "Update failed" }); }
});

app.get('/api/v1/manager/all-loans', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT l.*, s.full_name as "staffName", s.branch as "branchName"
            FROM loans l
            LEFT JOIN staff_users s ON LOWER(TRIM(l."createdByEmail")) = LOWER(TRIM(s.email))
            ORDER BY l."submittedDate" DESC`;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: "Failed to fetch loans" }); }
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

// --- SUPERVISOR LIST (PUBLIC for Signup) ---
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

// Open these routes for the Sign Up page
app.get('/api/v1/manager/supervisors', handleGetSupervisors);
app.get('/manager/supervisors', handleGetSupervisors);

// --- 6. LOAN & USER ROUTES ---

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
        const query = `
            INSERT INTO loans (
                "id", "customerName", "bvn", "nin", "phone", "loanAmount", "amount", "status", 
                "createdByEmail", "submittedDate", "bankName", "accountNumber", "employerName",
                "ninImageUrl", "idImageUrl", "passportImageUrl", "utilityBillUrl", 
                "workIdUrl", "statementUrl", "signatureUrl",
                "monthlyIncome", "loanType", "repaymentCycle", "gender"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`;
        
        const values = [
            uniqueId, 
            loan.customerName, 
            loan.bvn, 
            loan.nin, 
            loan.phone, 
            requestedAmount, 
            requestedAmount, 
            'Pending', 
            tokenEmail, 
            new Date().toISOString().split('T')[0], 
            loan.bankName, 
            loan.accountNumber, 
            loan.employerName || 'N/A', 
            loan.ninImageUrl, 
            loan.idImageUrl, 
            loan.passportImageUrl, 
            loan.utilityBillUrl, 
            loan.workIdUrl,
            loan.statementUrl,
            loan.signatureUrl,
            loan.monthlyIncome,
            loan.loanType,
            loan.repaymentCycle,
            loan.gender
        ];

        await db.query(query, values);
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

app.get('/', (req, res) => res.send("🚀 TrustMicro API Live"));
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Port ${PORT}`));



// require('dotenv').config(); 
// const express = require('express');
// const cors = require('cors');
// const { Pool } = require('pg');
// const jwt = require('jsonwebtoken');
// const bcrypt = require('bcryptjs');

// const app = express();
// const PORT = process.env.PORT || 5000;
// const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

// // --- CONFIGURATION & LIMITS ---
// const LOAN_LIMITS = {
//     'Federal': 1000000,
//     'State': 500000,
//     'Private': 250000
// };

// // --- 1. MIDDLEWARE SETUP ---
// app.use(cors({ 
//     origin: '*', 
//     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], 
//     allowedHeaders: ['Content-Type', 'Authorization'] 
// }));
// app.use(express.json());

// // Log requests for debugging production traffic
// app.use((req, res, next) => {
//     console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
//     next();
// });

// // --- 2. DATABASE INITIALIZATION ---
// const db = new Pool({
//     connectionString: process.env.DATABASE_URL,
//     ssl: { rejectUnauthorized: false }
// });

// // --- 3. AUTHENTICATION MIDDLEWARE ---
// const authenticateToken = (req, res, next) => {
//     const authHeader = req.headers['authorization'];
//     const token = authHeader && (authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader);
    
//     if (!token) return res.status(401).json({ error: "Unauthorized access" });

//     jwt.verify(token, JWT_SECRET, (err, user) => {
//         if (err) {
//             console.log(`[AUTH ERROR] JWT Verification failed: ${err.message}`);
//             return res.status(403).json({ error: "Session expired or invalid" });
//         }
//         req.user = user;
//         next();
//     });
// };

// // --- 4. AUTH & SECURITY (The "Memory" Solution) ---

// const handleLogin = async (req, res) => {
//     const { email, password } = req.body;
//     const cleanEmail = email?.trim().toLowerCase();
//     const client = await db.connect();
    
//     try {
//         await client.query('BEGIN');
//         const result = await client.query("SELECT * FROM staff_users WHERE LOWER(TRIM(email)) = $1", [cleanEmail]);
//         const user = result.rows[0];

//         // SOLUTION: If user doesn't exist, Rollback and return Sign Up error immediately.
//         if (!user) {
//             await client.query('ROLLBACK');
//             return res.status(404).json({ 
//                 error: "This account does not exist. Please Sign Up.",
//                 code: "USER_NOT_FOUND" 
//             });
//         }

//         // Check if locked
//         if (user.is_active === false || user.failed_attempts >= 3) {
//             await client.query('ROLLBACK');
//             return res.status(403).json({ error: "Account Deactivated. Contact Admin." });
//         }

//         const isMatch = await bcrypt.compare(password, user.password_hash);
//         if (!isMatch) {
//             const newCount = (user.failed_attempts || 0) + 1;
//             const stillActive = newCount < 3;
//             await client.query("UPDATE staff_users SET failed_attempts = $1, is_active = $2 WHERE id = $3", [newCount, stillActive, user.id]);
//             await client.query('COMMIT');
            
//             if (!stillActive) return res.status(403).json({ error: "Too many failed attempts. Account locked." });
//             return res.status(401).json({ error: `Invalid credentials. ${3 - newCount} attempts left.` });
//         }

//         // Reset on success
//         await client.query("UPDATE staff_users SET failed_attempts = 0, is_active = true WHERE id = $1", [user.id]);
//         await client.query('COMMIT');

//         const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
//         res.json({ token, user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role, branch: user.branch } });
//     } catch (e) { 
//         await client.query('ROLLBACK');
//         res.status(500).json({ error: "Internal Server Error" }); 
//     } finally { client.release(); }
// };

// app.post('/auth/login', handleLogin);
// app.post('/api/v1/auth/login', handleLogin);

// // Restored: Route for app to notify of auto-lockout
// app.post('/api/v1/auth/deactivate', async (req, res) => {
//     const { email } = req.body;
//     try {
//         await db.query("UPDATE staff_users SET is_active = false, failed_attempts = 3 WHERE LOWER(TRIM(email)) = $1", [email?.trim().toLowerCase()]);
//         res.json({ message: "Account locked successfully" });
//     } catch (e) { res.status(500).json({ error: "Lockout failed" }); }
// });

// app.post('/api/v1/auth/signup', async (req, res) => {
//     const { full_name, email, phone_no, branch, password, role } = req.body;
//     try {
//         const hash = await bcrypt.hash(password, 10);
//         await db.query(`INSERT INTO staff_users (full_name, email, phone_no, password_hash, role, branch, is_active, failed_attempts) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, 
//         [full_name, email.trim().toLowerCase(), phone_no, hash, role || 'Officer', branch, true, 0]);
//         res.status(201).json({ message: "Staff created" });
//     } catch (e) { res.status(500).json({ error: "Signup failed" }); }
// });

// // --- 5. MANAGER DASHBOARD ROUTES ---

// // Approve/Reject Loan Status Update
// app.patch('/api/v1/manager/update-status/:id', authenticateToken, async (req, res) => {
//     const { status } = req.body;
//     try {
//         const result = await db.query('UPDATE loans SET status = $1 WHERE id = $2 RETURNING *', [status, req.params.id]);
//         if (result.rowCount === 0) return res.status(404).json({ error: "Loan not found" });
//         res.json({ message: "Status updated" });
//     } catch (err) { res.status(500).json({ error: "Update failed" }); }
// });

// // Get All Loans (Joined with Staff Name)
// app.get('/api/v1/manager/all-loans', authenticateToken, async (req, res) => {
//     try {
//         const query = `
//             SELECT l.*, s.full_name as "staffName", s.branch as "branchName"
//             FROM loans l
//             LEFT JOIN staff_users s ON LOWER(TRIM(l."createdByEmail")) = LOWER(TRIM(s.email))
//             ORDER BY l."submittedDate" DESC`;
//         const result = await db.query(query);
//         res.json(result.rows);
//     } catch (err) { res.status(500).json({ error: "Failed to fetch loans" }); }
// });

// // Get All Staff
// app.get('/api/v1/manager/staff-list', authenticateToken, async (req, res) => {
//     try {
//         const result = await db.query('SELECT id, full_name, email, phone_no, role, branch, is_active FROM staff_users ORDER BY full_name ASC');
//         res.json(result.rows);
//     } catch (err) { res.status(500).json({ error: "Failed to fetch staff" }); }
// });

// // Reactivate Staff
// app.post('/api/v1/manager/reactivate-staff', authenticateToken, async (req, res) => {
//     const { staffEmail } = req.body;
//     try {
//         await db.query('UPDATE staff_users SET is_active = true, failed_attempts = 0 WHERE LOWER(TRIM(email)) = $1', [staffEmail.trim().toLowerCase()]);
//         res.json({ message: "Reactivated" });
//     } catch (err) { res.status(500).json({ error: "Reactivation failed" }); }
// });

// // --- 6. LOAN & USER ROUTES ---

// // Submit Loan (Updated with Dropdown logic & Limits)
// app.post('/api/v1/loans', authenticateToken, async (req, res) => {
//     const tokenEmail = req.user.email.trim().toLowerCase();
//     const loan = req.body;
//     const uniqueId = `LOAN-${Date.now()}`;

//     // --- SERVER SIDE VALIDATION ---
//     const requestedAmount = parseFloat(loan.loanAmount || 0);
//     const selectedType = loan.loanType || 'Private';
//     const limit = LOAN_LIMITS[selectedType] || 250000;

//     if (requestedAmount > limit) {
//         return res.status(400).json({ 
//             error: `Validation Error: Maximum amount for ${selectedType} loans is ₦${limit.toLocaleString()}` 
//         });
//     }

//     try {
//         const query = `
//             INSERT INTO loans (
//                 "id", "customerName", "bvn", "nin", "phone", "loanAmount", "amount", "status", 
//                 "createdByEmail", "submittedDate", "bankName", "accountNumber", "employerName",
//                 "ninImageUrl", "idImageUrl", "passportImageUrl", "utilityBillUrl", "signatureImageUrl",
//                 "monthlyIncome", "loanType", "repaymentCycle", "gender"
//             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`;
        
//         const values = [
//             uniqueId, 
//             loan.customerName, 
//             loan.bvn, 
//             loan.nin, 
//             loan.phone, 
//             requestedAmount, 
//             requestedAmount, 
//             'Pending', 
//             tokenEmail, 
//             new Date().toISOString().split('T')[0], 
//             loan.bankName, 
//             loan.accountNumber, 
//             loan.employerName || 'N/A', 
//             loan.ninImageUrl, 
//             loan.idImageUrl, 
//             loan.passportImageUrl, 
//             loan.utilityBillUrl, 
//             loan.signatureImageUrl,
//             loan.monthlyIncome,
//             loan.loanType,
//             loan.repaymentCycle,
//             loan.gender
//         ];

//         await db.query(query, values);
//         res.status(201).json({ message: "Loan Submitted" });
//     } catch (err) { 
//         res.status(500).json({ error: err.message }); 
//     }
// });

// // Get personal loans
// app.get('/api/v1/loans', authenticateToken, async (req, res) => {
//     try {
//         const result = await db.query('SELECT * FROM loans WHERE "createdByEmail" = $1', [req.user.email.trim().toLowerCase()]);
//         res.json(result.rows);
//     } catch (err) { res.status(500).json({ error: "Database error." }); }
// });

// // Sync User Profile
// app.get('/api/v1/users/me', authenticateToken, async (req, res) => {
//     try {
//         const result = await db.query('SELECT id, full_name, email, role, branch FROM staff_users WHERE id = $1', [req.user.id]);
//         res.json(result.rows[0]);
//     } catch (err) { res.status(500).json({ error: "Sync failed" }); }
// });

// app.get('/', (req, res) => res.send("🚀 TrustMicro API Live & Full"));
// app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Port ${PORT}`));
