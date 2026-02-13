const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import the database connection from your main server file
const db = require('../server').db; 
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

// --- STAFF LOGIN ROUTE ---
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Find the user in the database
        const query = "SELECT * FROM users WHERE email = ?";
        db.get(query, [email.trim().toLowerCase()], async (err, user) => {
            if (err) return res.status(500).json({ error: "Database error" });
            if (!user) return res.status(401).json({ error: "Invalid email or password" });

            // 2. Compare the hashed password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(401).json({ error: "Invalid email or password" });

            // 3. Generate JWT Token
            // We include the new fields so the Frontend knows the user's role immediately
            const token = jwt.sign(
                { 
                    id: user.id, 
                    email: user.email, 
                    role: user.role,
                    is_supervisor: user.is_supervisor,
                    is_loan_officer: user.is_loan_officer
                }, 
                JWT_SECRET, 
                { expiresIn: '24h' }
            );

            // 4. Send response back to the Mobile App
            res.json({
                token,
                user: {
                    id: user.id,
                    funame: user.funame,
                    email: user.email,
                    role: user.role,
                    branch: user.branch,
                    department: user.department,
                    unit: user.unit,
                    isSupervisor: user.is_supervisor === 1,
                    isLoanOfficer: user.is_loan_officer === 1
                }
            });
        });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// --- STAFF SIGN UP ROUTE (As discussed previously) ---
router.post('/signup', async (req, res) => {
    const { 
        fullName, email, phone, branch, password,
        department, unit, supervisor, isLoanOfficer, isSupervisor 
    } = req.body;

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const query = `
            INSERT INTO users (
                funame, email, phone_no, password, branch, role, 
                department, unit, supervisor_name, is_loan_officer, is_supervisor
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            fullName, email, phone, hashedPassword, branch, 'Officer', 
            department, unit, supervisor, isLoanOfficer ? 1 : 0, isSupervisor ? 1 : 0
        ];

        db.run(query, params, function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: this.lastID, message: "Account created" });
        });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;