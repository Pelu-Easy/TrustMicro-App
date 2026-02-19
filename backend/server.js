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

// --- 4. ROUTES ---
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

// SIGN-UP (With Email Normalization)
app.post('/api/v1/auth/signup', async (req, res) => {
    const { full_name, email, phone_no, branch, password, role } = req.body; 
    const cleanEmail = email.trim().toLowerCase();
    
    try {
        const userExists = await db.query("SELECT email FROM staff_users WHERE email = $1", [cleanEmail]);
        if (userExists.rows.length > 0) return res.status(400).json({ error: "Email already registered." });

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const query = `INSERT INTO staff_users (full_name, email, phone_no, password_hash, role, branch, is_active) 
                       VALUES ($1, $2, $3, $4, $5, $6, $7)`;
        
        await db.query(query, [full_name, cleanEmail, phone_no, hashedPassword, role || 'Officer', branch, true]);
        res.status(201).json({ message: "Staff account created successfully!" });
    } catch (error) { 
        console.error("Signup Error:", error.message);
        res.status(500).json({ error: "Internal Server Error" }); 
    }
});

// LOGIN (With Email Normalization)
app.post('/api/v1/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const cleanEmail = email.trim().toLowerCase();
    
    try {
        const result = await db.query("SELECT * FROM staff_users WHERE email = $1", [cleanEmail]);
        const user = result.rows[0];

        if (!user) return res.status(401).json({ error: "Invalid email or password" });
        if (user.is_active === false) return res.status(403).json({ error: "Account deactivated." });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ error: "Invalid email or password" });

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
        res.status(500).json({ error: "Server Error" });
    }
});

// GET SINGLE LOAN DETAIL
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

// RE-AUTHENTICATE USER
app.get('/api/v1/users/me', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT id, full_name, email, role, branch FROM staff_users WHERE id = $1', [req.user.id]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Auth sync failed" });
    }
});

// SECURE LOAN SUBMISSION (Normalized Email & Foreign Key Check)
app.post('/api/v1/loans', authenticateToken, async (req, res) => {
    const loan = req.body;
    const officerEmail = req.user.email.trim().toLowerCase(); 

    const staffCheck = await pool.query(
        'SELECT email FROM staff_users WHERE LOWER(TRIM(email)) = $1', 
        [officerEmail]
    );

    try {
        // Verify the staff user exists to avoid Foreign Key violations
        const staffCheck = await db.query("SELECT email FROM staff_users WHERE email = $1", [officerEmail]);
        
        if (staffCheck.rows.length === 0) {
            return res.status(400).json({ 
                error: `Staff record for ${officerEmail} not found. Please log out and back in.` 
            });
        }

        const query = `INSERT INTO loans (
            id, "createdByEmail", "customerName", amount, "loanAmount", status, "loanType", bvn, nin,
            phone, "bankName", "accountNumber", "submittedDate"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`;

        const params = [
            loan.id, 
            officerEmail, 
            loan.customerName, 
            loan.amount, 
            loan.loanAmount,
            loan.status || 'Pending', 
            loan.loanType, 
            loan.bvn, 
            loan.nin,
            loan.phone, 
            loan.bankName, 
            loan.accountNumber, 
            loan.submittedDate
        ];

        await db.query(query, params);
        res.status(201).json({ message: "Loan submitted successfully!" });
    } catch (err) {
        console.error("Loan Submission Error:", err.message);
        if (err.code === '23503') {
            return res.status(400).json({ error: "Auth Error: Staff email not recognized by database." });
        }
        res.status(500).json({ error: "Failed to save loan." });
    }
});

// LOANS FETCH
app.get('/api/v1/loans', authenticateToken, async (req, res) => {
    const email = req.user.email.trim().toLowerCase(); 
    try {
        const result = await db.query('SELECT * FROM loans WHERE "createdByEmail" = $1', [email]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Database error." });
    }
});

// PROFILE UPDATE
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server live and listening on Port ${PORT}`);
});