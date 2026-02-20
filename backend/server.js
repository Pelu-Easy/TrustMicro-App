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

// ACCOUNT DEACTIVATION
app.post('/api/v1/auth/deactivate', async (req, res) => {
    const { email } = req.body;
    const cleanEmail = email?.trim().toLowerCase();
    if (!cleanEmail) return res.status(400).json({ error: "Email is required" });
    try {
        const query = "UPDATE staff_users SET is_active = false, failed_attempts = 3 WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) RETURNING id";
        const result = await db.query(query, [cleanEmail]);
        res.status(200).json({ message: "Account locked and Admin notified." });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// SIGN-UP
app.post('/api/v1/auth/signup', async (req, res) => {
    const { full_name, email, phone_no, branch, password, role } = req.body; 
    const cleanEmail = email.trim().toLowerCase();
    try {
        const userExists = await db.query("SELECT email FROM staff_users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))", [cleanEmail]);
        if (userExists.rows.length > 0) return res.status(400).json({ error: "Email already registered." });
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = `INSERT INTO staff_users (full_name, email, phone_no, password_hash, role, branch, is_active, failed_attempts) 
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
        await db.query(query, [full_name, cleanEmail, phone_no, hashedPassword, role || 'Officer', branch, true, 0]);
        res.status(201).json({ message: "Staff account created successfully!" });
    } catch (error) { 
        res.status(500).json({ error: "Internal Server Error" }); 
    }
});

// LOGIN
app.post('/api/v1/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    const cleanEmail = email.trim().toLowerCase();
    try {
        const result = await db.query("SELECT * FROM staff_users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))", [cleanEmail]);
        const user = result.rows[0];
        if (!user) return res.status(401).json({ error: "Invalid email or password" });
        if (user.is_active === false || user.failed_attempts >= 3) return res.status(403).json({ error: "Account locked. Contact Admin." });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            const newFailedCount = (user.failed_attempts || 0) + 1;
            await db.query("UPDATE staff_users SET failed_attempts = $1, is_active = $2 WHERE id = $3", [newFailedCount, newFailedCount < 3, user.id]);
            return res.status(401).json({ error: `Invalid credentials. ${3 - newFailedCount} attempts left.` });
        }

        await db.query("UPDATE staff_users SET failed_attempts = 0, is_active = true WHERE id = $1", [user.id]);
        const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '12h' });
        res.json({ token, user: { full_name: user.full_name, email: user.email, role: user.role, branch: user.branch } });
    } catch (error) {
        res.status(500).json({ error: "Server Error" });
    }
});

// --- 5. SECURE DATA ROUTES ---

const managerRoutes = require('./routes/managerRoutes');
app.use('/api/v1/manager', managerRoutes);

app.get('/api/v1/users/me', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT id, full_name, email, role, branch FROM staff_users WHERE id = $1', [req.user.id]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Auth sync failed" });
    }
});

// LOAN SUBMISSION (Final Sync with Supabase Schema)
// LOAN SUBMISSION (Generates unique ID to fix NULL constraint error)
app.post('/api/v1/loans', authenticateToken, async (req, res) => {
    const officerEmail = req.user.email.trim().toLowerCase();
    try {
        // 1. Fetch the EXACT email string from the staff_users table first
        const staffCheck = await db.query(
            'SELECT email FROM staff_users WHERE LOWER(TRIM(email)) = $1', 
            [officerEmail]
        );
        
        if (staffCheck.rows.length === 0) {
            return res.status(400).json({ error: "Staff email not found in staff_users table." });
        }

        // Use the email EXACTLY as it appears in the database to satisfy the Foreign Key
        const dbEmail = staffCheck.rows[0].email;

        const loan = req.body;
        const uniqueLoanId = `LOAN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const query = `
            INSERT INTO loans (
                "id", "customerName", "bvn", "nin", "phone", "loanAmount", 
                "status", "createdByEmail", "submittedDate", 
                "bankName", "accountNumber"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *`;

        const values = [
            uniqueLoanId,
            loan.customerName, 
            loan.bvn, 
            loan.nin, 
            loan.phone,
            loan.loanAmount, 
            loan.status || 'Pending',
            dbEmail, // Using the verified email from the DB row
            new Date().toISOString().split('T')[0],
            loan.bankName, 
            loan.accountNumber
        ];

        const result = await db.query(query, values);
        console.log(`✅ Success! Loan saved with ID: ${uniqueLoanId}`);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("DATABASE INSERT ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/v1/loans', authenticateToken, async (req, res) => {
    const email = req.user.email.trim().toLowerCase(); 
    try {
        const result = await db.query('SELECT * FROM loans WHERE "createdByEmail" = LOWER(TRIM($1))', [email]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Database error." });
    }
});

app.post('/api/v1/manager/reactivate-staff', authenticateToken, async (req, res) => {
    const { staffEmail } = req.body;
    const adminRole = req.user.role?.toLowerCase();
    if (adminRole !== 'admin' && adminRole !== 'manager') return res.status(403).json({ error: "Unauthorized access." });
    try {
        const cleanEmail = staffEmail.trim().toLowerCase();
        await db.query("UPDATE staff_users SET is_active = true, failed_attempts = 0 WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))", [cleanEmail]);
        res.status(200).json({ message: "Account reactivated." });
    } catch (error) {
        res.status(500).json({ error: "Server error." });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server live on Port ${PORT}`);
});