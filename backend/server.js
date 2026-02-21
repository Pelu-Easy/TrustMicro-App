require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

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
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

db.on('connect', () => console.log('✅ Connected to TrustMicro Supabase Database.'));

// --- 3. AUTHENTICATION MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && (authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader);

    if (!token) return res.status(401).json({ error: "Unauthorized: Token missing" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Forbidden: Invalid token" });
        req.user = user;
        next();
    });
};

// --- 4. PUBLIC AUTH ROUTES ---

// LOGIN (With Security Strike Logic)
app.post('/api/v1/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    const cleanEmail = email.trim().toLowerCase();
    
    try {
        const result = await db.query(
            "SELECT * FROM staff_users WHERE LOWER(TRIM(email)) = $1", 
            [cleanEmail]
        );
        const user = result.rows[0];

        if (!user) return res.status(401).json({ error: "Invalid email or password" });

        if (user.is_active === false || (user.failed_attempts && user.failed_attempts >= 3)) {
            return res.status(403).json({ error: "Account Deactivated. Contact Admin." });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            const newCount = (user.failed_attempts || 0) + 1;
            const stillActive = newCount < 3;
            await db.query("UPDATE staff_users SET failed_attempts = $1, is_active = $2 WHERE id = $3", [newCount, stillActive, user.id]);
            if (!stillActive) return res.status(403).json({ error: "Too many failed attempts. Account locked." });
            return res.status(401).json({ error: `Invalid credentials. ${3 - newCount} attempts left.` });
        }

        await db.query("UPDATE staff_users SET failed_attempts = 0, is_active = true WHERE id = $1", [user.id]);
        const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '12h' });
        res.json({ token, user: { full_name: user.full_name, email: user.email, role: user.role, branch: user.branch } });
    } catch (error) { res.status(500).json({ error: "Internal Server Error" }); }
});

// SIGN-UP
app.post('/api/v1/auth/signup', async (req, res) => {
    const { full_name, email, phone_no, branch, password, role } = req.body; 
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query(`INSERT INTO staff_users (full_name, email, phone_no, password_hash, role, branch, is_active, failed_attempts) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, 
        [full_name, email.trim().toLowerCase(), phone_no, hashedPassword, role || 'Officer', branch, true, 0]);
        res.status(201).json({ message: "Staff account created successfully!" });
    } catch (error) { res.status(500).json({ error: "Signup failed" }); }
});

// DEACTIVATE
app.post('/api/v1/auth/deactivate', async (req, res) => {
    const { email } = req.body;
    try {
        await db.query("UPDATE staff_users SET is_active = false, failed_attempts = 3 WHERE LOWER(TRIM(email)) = $1", [email?.trim().toLowerCase()]);
        res.status(200).json({ message: "Account locked successfully." });
    } catch (error) { res.status(500).json({ error: "Internal server error" }); }
});

// --- 5. MANAGER DASHBOARD ROUTES (FIXES THE 404) ---

// Path 1: Some dashboards use /manager/all-staff
app.get('/api/v1/manager/all-staff', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT id, full_name, email, role, branch, is_active FROM staff_users ORDER BY full_name ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: "Database error" }); }
});

// Path 2: Some dashboards use /manager/staff
app.get('/api/v1/manager/staff', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT id, full_name, email, role, branch, is_active FROM staff_users ORDER BY full_name ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: "Database error" }); }
});

// Path 3: All Loans for Manager
app.get('/api/v1/manager/all-loans', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM loans ORDER BY "submittedDate" DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: "Database error" }); }
});

// Path 4: Reactivate
app.post('/api/v1/manager/reactivate-staff', authenticateToken, async (req, res) => {
    const { staffEmail } = req.body;
    try {
        await db.query('UPDATE staff_users SET is_active = true, failed_attempts = 0 WHERE LOWER(TRIM(email)) = $1', [staffEmail.trim().toLowerCase()]);
        res.status(200).json({ message: "Reactivated" });
    } catch (error) { res.status(500).json({ error: "Server error" }); }
});

// --- 6. LOAN & USER DATA ---

app.post('/api/v1/loans', authenticateToken, async (req, res) => {
    const tokenEmail = req.user.email.trim().toLowerCase();
    try {
        const staffCheck = await db.query('SELECT email FROM staff_users WHERE LOWER(TRIM(email)) = $1 LIMIT 1', [tokenEmail]);
        const verifiedDbEmail = staffCheck.rows[0].email;
        const loan = req.body;
        const uniqueLoanId = `LOAN-${Date.now()}`;
        const query = `INSERT INTO loans ("id", "customerName", "bvn", "nin", "phone", "loanAmount", "amount", "status", "createdByEmail", "submittedDate", "bankName", "accountNumber", "employerName") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`;
        const values = [uniqueLoanId, loan.customerName, loan.bvn, loan.nin, loan.phone, loan.loanAmount || 0, loan.loanAmount || 0, loan.status || 'Pending', verifiedDbEmail, new Date().toISOString().split('T')[0], loan.bankName, loan.accountNumber, loan.employerName || 'N/A'];
        const result = await db.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
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
    } catch (err) { res.status(500).json({ error: "Auth sync failed" }); }
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

// // --- 1. MIDDLEWARE SETUP ---
// app.use(cors({
//     origin: '*', 
//     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization']
// }));

// app.use(express.json());

// app.use((req, res, next) => {
//     console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
//     next();
// });

// // --- 2. DATABASE INITIALIZATION ---
// const db = new Pool({
//     connectionString: process.env.DATABASE_URL,
//     ssl: { rejectUnauthorized: false }
// });

// db.on('connect', () => console.log('✅ Connected to TrustMicro Supabase Database.'));
// db.on('error', (err) => console.error('❌ Unexpected database error:', err));

// module.exports.db = db; 

// // --- 3. AUTHENTICATION MIDDLEWARE ---
// const authenticateToken = (req, res, next) => {
//     const authHeader = req.headers['authorization'];
//     const token = authHeader && (authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader);

//     if (!token) return res.status(401).json({ error: "Unauthorized: Token missing" });

//     jwt.verify(token, JWT_SECRET, (err, user) => {
//         if (err) return res.status(403).json({ error: "Forbidden: Invalid token" });
//         req.user = user;
//         next();
//     });
// };

// app.get('/', (req, res) => res.send("🚀 TrustMicro Secure API is Live on Render!"));

// // --- 4. PUBLIC AUTH ROUTES ---

// // ACCOUNT DEACTIVATION
// app.post('/api/v1/auth/deactivate', async (req, res) => {
//     const { email } = req.body;
//     const cleanEmail = email?.trim().toLowerCase();
//     if (!cleanEmail) return res.status(400).json({ error: "Email is required" });
//     try {
//         const query = "UPDATE staff_users SET is_active = false, failed_attempts = 3 WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) RETURNING id";
//         const result = await db.query(query, [cleanEmail]);
//         res.status(200).json({ message: "Account locked and Admin notified." });
//     } catch (error) {
//         res.status(500).json({ error: "Internal server error" });
//     }
// });

// // SIGN-UP
// app.post('/api/v1/auth/signup', async (req, res) => {
//     const { full_name, email, phone_no, branch, password, role } = req.body; 
//     const cleanEmail = email.trim().toLowerCase();
//     try {
//         const userExists = await db.query("SELECT email FROM staff_users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))", [cleanEmail]);
//         if (userExists.rows.length > 0) return res.status(400).json({ error: "Email already registered." });
//         const hashedPassword = await bcrypt.hash(password, 10);
//         const query = `INSERT INTO staff_users (full_name, email, phone_no, password_hash, role, branch, is_active, failed_attempts) 
//                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
//         await db.query(query, [full_name, cleanEmail, phone_no, hashedPassword, role || 'Officer', branch, true, 0]);
//         res.status(201).json({ message: "Staff account created successfully!" });
//     } catch (error) { 
//         res.status(500).json({ error: "Internal Server Error" }); 
//     }
// });

// // LOGIN
// app.post('/api/v1/auth/login', async (req, res) => {
//     const { email, password } = req.body;
//     if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    
//     // Normalize: Remove spaces and force lowercase
//     const cleanEmail = email.trim().toLowerCase();
    
//     try {
//         // 1. Find user using a more flexible search
//         const result = await db.query(
//             "SELECT id, email, password_hash, is_active, failed_attempts, role, full_name, branch FROM staff_users WHERE LOWER(TRIM(email)) = $1", 
//             [cleanEmail]
//         );
        
//         const user = result.rows[0];

//         if (!user) {
//             console.log(`[AUTH] No user found for: ${cleanEmail}`);
//             return res.status(401).json({ error: "Invalid email or password" });
//         }

//         // 2. Immediate Lock Check
//         // Check both the boolean and the count (safety net)
//         if (user.is_active === false || (user.failed_attempts && user.failed_attempts >= 3)) {
//             console.log(`[SECURITY] Blocked login attempt for LOCKED user: ${cleanEmail}`);
//             return res.status(403).json({ error: "Account Deactivated. Contact Admin." });
//         }

//         const isMatch = await bcrypt.compare(password, user.password_hash);

//         if (!isMatch) {
//             const newFailedCount = (user.failed_attempts || 0) + 1;
//             const shouldLock = newFailedCount >= 3;

//             console.log(`[AUTH] Wrong password for ${cleanEmail}. Attempt: ${newFailedCount}`);

//             // 3. FORCE UPDATE THE DATABASE
//             // Using ID instead of Email for the WHERE clause is much more reliable
//             const updateQuery = `
//                 UPDATE staff_users 
//                 SET failed_attempts = $1, 
//                     is_active = $2 
//                 WHERE id = $3 
//                 RETURNING failed_attempts, is_active`;
            
//             const updateRes = await db.query(updateQuery, [newFailedCount, !shouldLock, user.id]);
            
//             console.log(`[DB SYNC] Updated User ${user.id}: Attempts=${updateRes.rows[0].failed_attempts}, Active=${updateRes.rows[0].is_active}`);

//             if (shouldLock) {
//                 return res.status(403).json({ error: "Too many failed attempts. Account locked." });
//             } else {
//                 return res.status(401).json({ error: `Invalid credentials. ${3 - newFailedCount} attempts left.` });
//             }
//         }

//         // 4. Success - Reset everything
//         await db.query("UPDATE staff_users SET failed_attempts = 0, is_active = true WHERE id = $1", [user.id]);
        
//         const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '12h' });
        
//         res.json({ 
//             token, 
//             user: { full_name: user.full_name, email: user.email, role: user.role, branch: user.branch } 
//         });

//     } catch (error) {
//         console.error("CRITICAL LOGIN ERROR:", error);
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// });

// // --- 5. SECURE DATA ROUTES ---

// const managerRoutes = require('./routes/managerRoutes');
// app.use('/api/v1/manager', managerRoutes);

// app.get('/api/v1/users/me', authenticateToken, async (req, res) => {
//     try {
//         const result = await db.query('SELECT id, full_name, email, role, branch FROM staff_users WHERE id = $1', [req.user.id]);
//         res.json(result.rows[0]);
//     } catch (err) {
//         res.status(500).json({ error: "Auth sync failed" });
//     }
// });

// // LOAN SUBMISSION (Final Sync with Supabase Schema)
// // LOAN SUBMISSION (Generates unique ID to fix NULL constraint error)
// app.post('/api/v1/loans', authenticateToken, async (req, res) => {
//     // 1. Get the email from the token
//     const tokenEmail = req.user.email.trim().toLowerCase();
    
//     try {
//         // 2. Fetch the EXACT user record to ensure we match the Foreign Key exactly
//         const staffCheck = await db.query(
//             'SELECT email FROM staff_users WHERE LOWER(TRIM(email)) = $1 LIMIT 1', 
//             [tokenEmail]
//         );
        
//         if (staffCheck.rows.length === 0) {
//             console.error(`[AUTH ERROR] ${tokenEmail} not found in staff_users table.`);
//             return res.status(400).json({ error: "Your staff account is not fully registered in the staff_users table." });
//         }

//         // This is the email EXACTLY as it is stored in the database
//         const verifiedDbEmail = staffCheck.rows[0].email;
//         console.log(`[DEBUG] Attempting insert for verified staff: ${verifiedDbEmail}`);

//         const loan = req.body;
//         const uniqueLoanId = `LOAN-${Date.now()}`;

//         // 3. The Insert Query
//         // We use double quotes for camelCase columns and cast $8 (email) to text
//         const query = `
//             INSERT INTO loans (
//                 "id", 
//                 "customerName", 
//                 "bvn", 
//                 "nin", 
//                 "phone", 
//                 "loanAmount", 
//                 "amount", 
//                 "status", 
//                 "createdByEmail", 
//                 "submittedDate", 
//                 "bankName", 
//                 "accountNumber",
//                 "employerName"
//             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
//             RETURNING *`;

//         const values = [
//             uniqueLoanId,            // $1
//             loan.customerName,       // $2
//             loan.bvn,                // $3
//             loan.nin,                // $4
//             loan.phone,              // $5
//             loan.loanAmount || 0,    // $6
//             loan.loanAmount || 0,    // $7 (Mapping to 'amount' column)
//             loan.status || 'Pending',// $8
//             verifiedDbEmail,         // $9 (The FK link)
//             new Date().toISOString().split('T')[0], // $10
//             loan.bankName,           // $11
//             loan.accountNumber,       // $12
//             loan.employerName || 'N/A' //$13 Now sending the employer name!
//         ];

//         const result = await db.query(query, values);
//         console.log(`✅ Success! Loan ${uniqueLoanId} created.`);
//         res.status(201).json(result.rows[0]);

//     } catch (err) {
//         console.error("❌ DATABASE INSERT ERROR:", err.message);
//         // If it's STILL a FK error, it means the column 'createdByEmail' 
//         // in 'loans' isn't actually linked to the 'email' column in 'staff_users'
//         res.status(500).json({ error: err.message });
//     }
// });

// app.get('/api/v1/loans', authenticateToken, async (req, res) => {
//     const email = req.user.email.trim().toLowerCase(); 
//     try {
//         const result = await db.query('SELECT * FROM loans WHERE "createdByEmail" = LOWER(TRIM($1))', [email]);
//         res.json(result.rows);
//     } catch (err) {
//         res.status(500).json({ error: "Database error." });
//     }
// });

// // ADMIN/MANAGER REACTIVATE (Clears locks and resets attempts)
// app.post('/api/v1/manager/reactivate-staff', authenticateToken, async (req, res) => {
//     const { staffEmail } = req.body;
//     const adminRole = req.user.role?.toLowerCase();

//     // Verify if the person making the request has permission
//     if (adminRole !== 'admin' && adminRole !== 'super admin' && adminRole !== 'manager') {
//         return res.status(403).json({ error: "Unauthorized: Only Admins or Managers can reactivate accounts." });
//     }

//     if (!staffEmail) {
//         return res.status(400).json({ error: "Staff email is required for reactivation." });
//     }

//     try {
//         const cleanEmail = staffEmail.trim().toLowerCase();
        
//         // Update the user: Reset failed attempts to 0 and set is_active to true
//         const query = `
//             UPDATE staff_users 
//             SET is_active = true, failed_attempts = 0 
//             WHERE LOWER(TRIM(email)) = $1
//             RETURNING full_name, email`;

//         const result = await db.query(query, [cleanEmail]);

//         if (result.rowCount === 0) {
//             return res.status(404).json({ error: "Staff user not found in database." });
//         }

//         console.log(`[ADMIN] Account reactivated for: ${result.rows[0].full_name} (${result.rows[0].email})`);
        
//         res.status(200).json({ 
//             message: `Account for ${result.rows[0].full_name} has been successfully reactivated.`,
//             user: result.rows[0]
//         });
//     } catch (error) {
//         console.error("Reactivation Error:", error.message);
//         res.status(500).json({ error: "Server error during reactivation." });
//     }
// });

// app.listen(PORT, '0.0.0.0', () => {
//     console.log(`🚀 Server live on Port ${PORT}`);
// });