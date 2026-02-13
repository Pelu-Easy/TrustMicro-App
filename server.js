require('dotenv').config();
console.log("🛠️ Current Environment:", process.env.NODE_ENV);
console.log("🛠️ Database URL Present?:", !!process.env.DATABASE_URL); 
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg'); // For Cloud PostgreSQL (Supabase)
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

// --- 1. HYBRID DATABASE INITIALIZATION ---
const isProduction = process.env.NODE_ENV === 'production';
let db;

if (isProduction) {
    // Connect to Supabase/PostgreSQL for Cloud
    db = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    console.log('✅ Connected to Cloud PostgreSQL (Supabase)');
} else {
    // Use local SQLite for development
    db = new sqlite3.Database('./trustmicro.db', (err) => {
        if (err) console.error('SQLite connection error:', err);
        else console.log('✅ Connected to Local TrustMicro SQLite Database.');
    });
}

/**
 * UNIFIED QUERY HELPER
 * This ensures your code works the same way for both SQLite and Postgres
 */
const query = (text, params) => {
    if (isProduction) {
        // Postgres uses $1, $2, etc. instead of ?
        const pgText = text.replace(/\?/g, (_, i) => `$${i + 1}`);
        return db.query(pgText, params);
    } else {
        return new Promise((resolve, reject) => {
            // For INSERT/UPDATE/DELETE (run)
            if (text.trim().toLowerCase().startsWith('insert') || text.trim().toLowerCase().startsWith('update')) {
                db.run(text, params, function(err) {
                    if (err) reject(err);
                    else resolve({ rows: [], lastID: this.lastID });
                });
            } else {
                // For SELECT (all/get)
                db.all(text, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve({ rows });
                });
            }
        });
    }
};

// --- 2. MIDDLEWARE SETUP ---
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

// --- 3. ROUTES SETUP ---
const managerRoutes = require('./routes/managerRoutes');
app.use('/api/v1/manager', managerRoutes);

// --- 4. AUTHENTICATION MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- 5. AUTH & LOAN ROUTES ---

// SIGN-UP
app.post('/api/v1/auth/signup', async (req, res) => {
    const { fullName, email, phone, branch, password, role, department, unit, supervisor, is_supervisor } = req.body;
    try {
        const checkUser = await query("SELECT email FROM users WHERE email = ?", [email]);
        if (checkUser.rows.length > 0) return res.status(400).json({ error: "Email already registered." });

        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = `INSERT INTO users (full_name, email, phone_no, password_hash, role, branch, department, unit, supervisor, is_supervisor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await query(sql, [fullName, email, phone, hashedPassword, role || 'Officer', branch, department, unit, supervisor, is_supervisor || 0]);
        
        res.status(201).json({ message: "Staff account created successfully!" });
    } catch (error) { 
        console.error("Signup Error:", error.message);
        res.status(500).json({ error: "Internal Server Error" }); 
    }
});

// LOGIN
app.post('/api/v1/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await query("SELECT * FROM users WHERE email = ?", [email]);
        const user = result.rows[0];

        if (!user) return res.status(401).json({ error: "Invalid email or password" });
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ error: "Invalid email or password" });

        const token = jwt.sign({ 
            id: user.id, 
            role: user.role, 
            email: user.email,
            is_supervisor: user.is_supervisor 
        }, JWT_SECRET, { expiresIn: '12h' });

        res.json({
            token,
            user: { 
                funame: user.full_name,
                email: user.email, 
                phone: user.phone_no,
                role: user.role, 
                branch: user.branch,
                department: user.department,
                unit: user.unit,
                supervisor: user.supervisor
            }
        });
    } catch (error) {
        res.status(500).json({ error: "Login failed" });
    }
});

// SUBMIT LOAN
app.post('/api/v1/loans', authenticateToken, async (req, res) => {
    const loan = req.body;
    const officerEmail = req.user.email; 
    const now = new Date().toISOString();

    const sql = `INSERT INTO loans (
        id, createdByEmail, customerName, amount, loanAmount, status, loanType, bvn, nin,
        phone, bankName, accountNumber, submittedDate, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
        loan.id, officerEmail, loan.customerName, loan.amount, loan.loanAmount,
        loan.status || 'Pending', loan.loanType, loan.bvn, loan.nin,
        loan.phone, loan.bankName, loan.accountNumber, loan.submittedDate, now
    ];

    try {
        await query(sql, params);
        res.status(201).json({ message: "Loan submitted successfully!" });
    } catch (err) {
        console.error("Loan Submission Error:", err.message);
        res.status(500).json({ error: "Failed to save loan." });
    }
});

// FETCH LOANS
app.get('/api/v1/loans', authenticateToken, async (req, res) => {
    const { email, role, is_supervisor } = req.user; 
    let sql;
    let params = [];
    const userRole = role ? role.toLowerCase() : '';

    if (userRole === 'manager' || userRole === 'supervisor' || is_supervisor == 1) {
        sql = "SELECT * FROM loans ORDER BY createdAt DESC";
    } else {
        sql = "SELECT * FROM loans WHERE createdByEmail = ? ORDER BY createdAt DESC";
        params = [email];
    }

    try {
        const result = await query(sql, params);
        res.json(result.rows || []);
    } catch (err) {
        console.error("Database error during fetch:", err.message);
        res.status(500).json({ error: "Database error." });
    }
});

// START SERVER
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 TrustMicro Server live at http://192.168.88.38:${PORT}`);
});