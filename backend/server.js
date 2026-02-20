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
db.on('error', (err) => console.error('❌ Unexpected database error:', err));

module.exports.db = db; 

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

app.get('/', (req, res) => res.send("🚀 TrustMicro Secure API is Live on Render!"));

// --- 4. PUBLIC AUTH ROUTES ---

// ACCOUNT DEACTIVATION (Used by frontend when 3 strikes are reached)
app.post('/api/v1/auth/deactivate', async (req, res) => {
    const { email, reason } = req.body;
    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanEmail) return res.status(400).json({ error: "Email is required" });

    try {
        const query = "UPDATE staff_users SET is_active = false, failed_attempts = 3 WHERE email = $1";
        await db.query(query, [cleanEmail]);

        console.log(`[SECURITY] Account ${cleanEmail} deactivated. Reason: ${reason}`);
        res.status(200).json({ message: "Account locked and Admin notified." });
    } catch (error) {
        console.error("Deactivation Route Error:", error);
        res.status(500).json({ error: "Internal server error during deactivation" });
    }
});

const managerRoutes = require('./routes/managerRoutes');
app.use('/api/v1/manager', managerRoutes);

// CHECK PHONE UNIQUE ROUTE
app.get('/api/v1/auth/check-phone/:phone', async (req, res) => {
    try {
        const { phone } = req.params;
        const query = "SELECT id, is_active FROM staff_users WHERE phone_no = $1";
        const result = await db.query(query, [phone.trim()]);

        if (result.rows.length > 0) {
            return res.status(200).json({ 
                exists: true, 
                isActive: result.rows[0].is_active 
            });
        }
        res.status(200).json({ exists: false });
    } catch (error) {
        console.error("Phone Check Error:", error);
        res.status(500).json({ error: "Database error checking phone number" });
    }
});

// SIGN-UP
app.post('/api/v1/auth/signup', async (req, res) => {
    const { full_name, email, phone_no, branch, password, role } = req.body; 
    const cleanEmail = email.trim().toLowerCase();
    
    try {
        const userExists = await db.query("SELECT email FROM staff_users WHERE email = $1", [cleanEmail]);
        if (userExists.rows.length > 0) return res.status(400).json({ error: "Email already registered." });

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const query = `INSERT INTO staff_users (full_name, email, phone_no, password_hash, role, branch, is_active, failed_attempts) 
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
        
        await db.query(query, [full_name, cleanEmail, phone_no, hashedPassword, role || 'Officer', branch, true, 0]);
        res.status(201).json({ message: "Staff account created successfully!" });
    } catch (error) { 
        console.error("Signup Error:", error.message);
        res.status(500).json({ error: "Internal Server Error" }); 
    }
});

// LOGIN (Strict Enforcement of is_active and failed_attempts)
app.post('/api/v1/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const cleanEmail = email.trim().toLowerCase();
    
    try {
        const result = await db.query("SELECT * FROM staff_users WHERE email = $1", [cleanEmail]);
        const user = result.rows[0];

        if (!user) return res.status(401).json({ error: "Invalid email or password" });

        // 1. CRITICAL: Check if account is active BEFORE anything else
        if (user.is_active === false) {
            return res.status(403).json({ error: "Account locked or deactivated. Please contact Admin." });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            const newFailedCount = (user.failed_attempts || 0) + 1;
            
            if (newFailedCount >= 3) {
                // Lock account in DB
                await db.query("UPDATE staff_users SET failed_attempts = $1, is_active = false WHERE email = $2", [newFailedCount, cleanEmail]);
                return res.status(403).json({ error: "Too many failed attempts. Account locked. Contact Admin." });
            } else {
                // Increment counter in DB
                await db.query("UPDATE staff_users SET failed_attempts = $1 WHERE email = $2", [newFailedCount, cleanEmail]);
                return res.status(401).json({ error: `Invalid credentials. ${3 - newFailedCount} attempts remaining.` });
            }
        }

        // 2. SUCCESS: Reset failed attempts on successful login
        await db.query("UPDATE staff_users SET failed_attempts = 0 WHERE email = $1", [cleanEmail]);

        const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '12h' });
        
        res.json({
            token,
            user: { 
                full_name: user.full_name, 
                email: user.email, 
                role: user.role, 
                branch: user.branch 
            }
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Server Error" });
    }
});

// --- ROUTES REQUIRING TOKEN ---

app.get('/api/v1/loans/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM loans WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Loan not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Database error" });
    }
});

app.get('/api/v1/users/me', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT id, full_name, email, role, branch FROM staff_users WHERE id = $1', [req.user.id]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Auth sync failed" });
    }
});

app.post('/loans', authenticateToken, async (req, res) => {
    const officerEmail = req.user.email.trim().toLowerCase();
    try {
        const staffCheck = await db.query('SELECT email FROM staff_users WHERE LOWER(TRIM(email)) = $1', [officerEmail]);
        if (staffCheck.rows.length === 0) return res.status(400).json({ error: "Staff email not recognized." });

        const loan = req.body;
        const query = `
            INSERT INTO loans (
                customer_name, bvn, nin, phone, loan_amount, 
                status, "createdByEmail", "submittedDate", 
                bank_name, account_number, employer_name
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *`;

        const values = [
            loan.customerName, loan.bvn, loan.nin, loan.phone,
            parseFloat(loan.loanAmount) || 0, loan.status || 'Pending',
            officerEmail, new Date().toISOString().split('T')[0],
            loan.bankName, loan.accountNumber, loan.employerName
        ];

        const result = await db.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/v1/loans', authenticateToken, async (req, res) => {
    const email = req.user.email.trim().toLowerCase(); 
    try {
        const result = await db.query('SELECT * FROM loans WHERE "createdByEmail" = $1', [email]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Database error." });
    }
});

app.patch('/api/v1/users/update-profile', authenticateToken, async (req, res) => {
    const { full_name, phone_no, email } = req.body; 
    const userId = req.user.id;
    const cleanEmail = email.trim().toLowerCase();
    const query = `UPDATE staff_users SET full_name = $1, phone_no = $2, email = $3 WHERE id = $4`;
    try {
        await db.query(query, [full_name, phone_no, cleanEmail, userId]);
        res.json({ message: "Profile updated!" });
    } catch (err) {
        res.status(500).json({ error: "Update failed." });
    }
});

// THE REACTIVATE ROUTE (Already exists in managerRoutes, but including the root-level version here for completeness)
app.post('/api/v1/manager/reactivate-staff', authenticateToken, async (req, res) => {
    const { staffEmail } = req.body;
    const adminRole = req.user.role?.toLowerCase();

    if (adminRole !== 'admin' && adminRole !== 'super admin' && adminRole !== 'manager') {
        return res.status(403).json({ error: "Unauthorized: Access Denied." });
    }

    if (!staffEmail) return res.status(400).json({ error: "Staff email is required." });

    try {
        const cleanEmail = staffEmail.trim().toLowerCase();
        const query = `
            UPDATE staff_users 
            SET is_active = true, failed_attempts = 0 
            WHERE email = $1
            RETURNING full_name`;

        const result = await db.query(query, [cleanEmail]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Staff user not found." });
        }

        res.status(200).json({ 
            message: `Account for ${result.rows[0].full_name} has been reactivated.` 
        });

    } catch (error) {
        console.error("Reactivation Error:", error);
        res.status(500).json({ error: "Server error during reactivation." });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server live and listening on Port ${PORT}`);
});