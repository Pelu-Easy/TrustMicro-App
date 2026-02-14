require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

// --- 1. MIDDLEWARE SETUP ---
// FIXED: Combined into one powerful CORS setting
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Logger: This will now show every single attempt from your phone
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// --- 2. DATABASE INITIALIZATION ---
const db = new sqlite3.Database('./trustmicro.db', (err) => {
    if (err) console.error('Database connection error:', err);
    else console.log('✅ Connected to TrustMicro SQLite Database.');
});

// Export db for managerRoutes
module.exports.db = db; 

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS staff_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT,
        email TEXT UNIQUE,
        password_hash TEXT,
        phone_no TEXT,
        role TEXT DEFAULT 'Officer',
        branch TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS loans (
        id TEXT PRIMARY KEY,
        createdByEmail TEXT,
        customerName TEXT,
        amount TEXT,
        loanAmount TEXT,
        status TEXT DEFAULT 'Pending',
        loanType TEXT,
        bvn TEXT,
        nin TEXT,
        phone TEXT,
        bankName TEXT,
        accountNumber TEXT,
        submittedDate TEXT
    )`);
});

// --- 3. AUTHENTICATION MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // FIXED: More robust token extraction
    const token = authHeader && (authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader);

    if (!token) return res.status(401).json({ error: "Unauthorized: Token missing" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Forbidden: Invalid token" });
        req.user = user;
        next();
    });
};

app.get('/', (req, res) => {
    res.send("🚀 TrustMicro Secure API is Live and Listening!");
});

// --- 4. ROUTES ---
const managerRoutes = require('./routes/managerRoutes');
app.use('/api/v1/manager', managerRoutes);

// SIGN-UP
app.post('/api/v1/auth/signup', async (req, res) => {
    const { fullName, email, phone, branch, password, role } = req.body;
    try {
        db.get("SELECT email FROM staff_users WHERE email = ?", [email], async (err, row) => {
            if (row) return res.status(400).json({ error: "Email already registered." });

            const hashedPassword = await bcrypt.hash(password, 10);
            const query = `INSERT INTO staff_users (full_name, email, phone_no, password_hash, role, branch) VALUES (?, ?, ?, ?, ?, ?)`;
            db.run(query, [fullName, email, phone, hashedPassword, role || 'Officer', branch], function(err) {
                if (err) return res.status(500).json({ error: "Database insert error." });
                res.status(201).json({ message: "Staff account created successfully!" });
            });
        });
    } catch (error) { res.status(500).json({ error: "Internal Server Error" }); }
});

// LOGIN
app.post('/api/v1/auth/login', (req, res) => {
    const { email, password } = req.body;
    db.get("SELECT * FROM staff_users WHERE email = ?", [email], async (err, user) => {
        if (err || !user) return res.status(401).json({ error: "Invalid email or password" });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ error: "Invalid email or password" });

        const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '12h' });
        res.json({
            token,
            user: { funame: user.full_name, email: user.email, role: user.role, branch: user.branch }
        });
    });
});

// SECURE LOAN SUBMISSION
app.post('/api/v1/loans', authenticateToken, (req, res) => {
    const loan = req.body;
    const officerEmail = req.user.email; 

    const query = `INSERT INTO loans (
        id, createdByEmail, customerName, amount, loanAmount, status, loanType, bvn, nin,
        phone, bankName, accountNumber, submittedDate
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
        loan.id, officerEmail, loan.customerName, loan.amount, loan.loanAmount,
        loan.status || 'Pending', loan.loanType, loan.bvn, loan.nin,
        loan.phone, loan.bankName, loan.accountNumber, loan.submittedDate
    ];

    db.run(query, params, function(err) {
        if (err) return res.status(500).json({ error: "Failed to save loan." });
        res.status(201).json({ message: "Loan submitted successfully!" });
    });
});

// LOANS FETCH (Isolated)
app.get('/api/v1/loans', authenticateToken, (req, res) => {
    const email = req.user.email; 
    db.all("SELECT * FROM loans WHERE createdByEmail = ?", [email], (err, rows) => {
        if (err) return res.status(500).json({ error: "Database error." });
        res.json(rows);
    });
});

// PROFILE UPDATE
app.patch('/api/v1/users/update-profile', authenticateToken, (req, res) => {
    const { funame, phone_no, email } = req.body;
    const userId = req.user.id;
    const query = `UPDATE staff_users SET full_name = ?, phone_no = ?, email = ? WHERE id = ?`;
    db.run(query, [funame, phone_no, email, userId], function(err) {
        if (err) return res.status(500).json({ error: "Update failed." });
        res.json({ message: "Profile updated!" });
    });
});

// --- 5. START SERVER ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 TrustMicro Server live at http://192.168.100.120:${PORT}`);
});


// require('dotenv').config(); // Load .env variables at the very top
// const express = require('express');
// const cors = require('cors');
// const sqlite3 = require('sqlite3').verbose();
// const jwt = require('jsonwebtoken');
// const bcrypt = require('bcrypt');


// // --- 1. MIDDLEWARE (Must be before routes) ---
// app.use(cors());
// app.use(express.json());
// const app = express();

// // Import Routes
// const managerRoutes = require('./routes/managerRoutes');
// app.use('/api/v1/manager', managerRoutes);

// // --- 2. DATABASE INITIALIZATION (Must be before routes) ---
// const db = new sqlite3.Database('./trustmicro.db', (err) => {
//     if (err) console.error('Database connection error:', err);
//     console.log('Connected to TrustMicro SQLite Database.');
// });

// module.exports.db = db; 

// //authenticateToken function
// const authenticateToken = (req, res, next) => {
//     const authHeader = req.headers['authorization'];
//     const token = authHeader && authHeader.split(' ')[1];

//     if (!token) return res.status(401).json({ error: "Unauthorized" });

//     jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
//         if (err) return res.status(403).json({ error: "Forbidden" });
//         req.user = user;
//         next();
//     });
// };

// // SECURE LOAN SUBMISSION
// app.post('/api/v1/loans', authenticateToken, (req, res) => {
//     const loan = req.body;
//     const officerEmail = req.user.email; // Extracted safely from JWT

//     const query = `INSERT INTO loans (
//         id, createdByEmail, customerName, amount, status, loanType, bvn, nin,
//          phone, bankName, accountNumber, submittedDate
//     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)`;

//     const params = [
//         loan.id, 
//         officerEmail, 
//         loan.customerName, 
//         loan.amount, 
//         loan.status || 'Pending', 
//         loan.loanType,
//         loan.bvn,
//         loan.nin,
//         loan.phone,
//         loan.bankName,
//         loan.accountNumber,
//         loan.submittedDate
//     ];

//     db.run(query, params, function(err) {
//         if (err) {
//             console.error(err.message);
//             return res.status(500).json({ error: "Failed to save loan to database." });
//         }
//         res.status(201).json({ message: "Loan submitted and tied to your profile!", loanId: loan.id });
//     });
// });

// // Create tables
// db.serialize(() => {
//     // Loans Table
//     db.run(`CREATE TABLE IF NOT EXISTS loans (
//         id TEXT PRIMARY KEY,
//         createdByEmail TEXT,
//         customerName TEXT,
//         amount TEXT,
//         status TEXT,
//         loanType TEXT
//     )`);

//     // Staff Users Table (Missing in your version)
//     db.run(`CREATE TABLE IF NOT EXISTS staff_users (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         full_name TEXT,
//         email TEXT UNIQUE,
//         password_hash TEXT,
//         role TEXT DEFAULT 'Officer',
//         branch TEXT
//     )`);
// });

// // --- 3. ROUTES ---

// // Import Manager Routes (Ensure these are after express.json())
// const managerRoutes = require('./routes/managerRoutes');
// app.use('/api/v1/manager', managerRoutes);

// const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

// // SIGN-UP ROUTE
// app.post('/api/v1/auth/signup', async (req, res) => {
//     const { fullName, email, phone, branch, password, role } = req.body;

//     try {
//         // 1. Check if user already exists
//         db.get("SELECT email FROM staff_users WHERE email = ?", [email], async (err, row) => {
//             if (row) return res.status(400).json({ error: "Email already registered." });

//             // 2. Hash the password securely
//             const saltRounds = 10;
//             const hashedPassword = await bcrypt.hash(password, saltRounds);

//             // 3. Insert into Database
//             const query = `INSERT INTO staff_users (full_name, email, password_hash, role, branch) VALUES (?, ?, ?, ?, ?)`;
//             db.run(query, [fullName, email, hashedPassword, role || 'Officer', branch], function(err) {
//                 if (err) return res.status(500).json({ error: "Database error during registration." });
                
//                 res.status(201).json({ 
//                     message: "Staff account created successfully!",
//                     userId: this.lastID 
//                 });
//             });
//         });
//     } catch (error) {
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// });


// // LOGIN ROUTE
// app.post('/api/v1/auth/login', async (req, res) => {
//     const { email, password } = req.body;

//     try {
//         db.get("SELECT * FROM staff_users WHERE email = ?", [email], async (err, user) => {
//             if (err || !user) {
//                 return res.status(401).json({ error: "Invalid staff email or password" });
//             }

//             const isMatch = await bcrypt.compare(password, user.password_hash);
//             if (!isMatch) {
//                 return res.status(401).json({ error: "Invalid staff email or password" });
//             }

//             const token = jwt.sign(
//                 { id: user.id, role: user.role, email: user.email },
//                 JWT_SECRET,
//                 { expiresIn: '12h' }
//             );

//             res.json({
//                 message: "Authentication successful",
//                 token: token,
//                 user: {
//                     funame: user.full_name,
//                     email: user.email,
//                     role: user.role,
//                     branch: user.branch
//                 }
//             });
//         });
//     } catch (error) {
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// });

// // PROFILE UPDATE ROUTE
// // This matches the axios.patch call in your profilesumary.tsx
// app.patch('/api/v1/users/update-profile', authenticateToken, (req, res) => {
//     const { funame, phone_no, email } = req.body;
//     const userId = req.user.id; // Extracted safely from the JWT token

//     // 1. Validation
//     if (!funame || !email) {
//         return res.status(400).json({ error: "Name and Email are required." });
//     }

//     // 2. Update Database
//     const query = `
//         UPDATE staff_users 
//         SET full_name = ?, phone_no = ?, email = ? 
//         WHERE id = ?
//     `;

//     db.run(query, [funame, phone_no, email, userId], function(err) {
//         if (err) {
//             if (err.message.includes("UNIQUE constraint failed")) {
//                 return res.status(400).json({ error: "Email is already in use by another staff." });
//             }
//             return res.status(500).json({ error: "Database error during profile update." });
//         }

//         if (this.changes === 0) {
//             return res.status(404).json({ error: "User not found." });
//         }

//         console.log(`Profile updated for user ID: ${userId}`);
//         res.json({ message: "Profile updated successfully!" });
//     });
// });


// // LOANS FETCH (Isolated)
// app.get('/api/v1/loans', (req, res) => {
//     const { email } = req.query; 
//     db.all("SELECT * FROM loans WHERE createdByEmail = ?", [email], (err, rows) => {
//         if (err) return res.status(500).json({ error: err.message });
//         res.json(rows);
//     });
// });

// // LOAN SUBMISSION
// app.post('/api/v1/loans', (req, res) => {
//     const loan = req.body;
//     const stmt = db.prepare("INSERT INTO loans (id, createdByEmail, customerName, amount, status, loanType) VALUES (?, ?, ?, ?, ?, ?)");
    
//     stmt.run(loan.id, loan.createdByEmail, loan.customerName, loan.amount, loan.status, loan.loanType, (err) => {
//         if (err) return res.status(500).json({ error: err.message });
//         res.status(201).json({ message: "Loan synced successfully" });
//     });
// });

// // --- 4. START SERVER ---
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`TrustMicro Server running at http://localhost:${PORT}`));
