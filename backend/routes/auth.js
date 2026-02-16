const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import the PG database connection from your main server file
const { db } = require('../server'); 
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

// --- STAFF LOGIN ROUTE ---
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. PostgreSQL syntax uses $1 and db.query
        const query = "SELECT * FROM staff_users WHERE email = $1";
        const result = await db.query(query, [email.trim().toLowerCase()]);
        const user = result.rows[0];

        if (!user) return res.status(401).json({ error: "Invalid email or password" });

        // 2. Compare the hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: "Invalid email or password" });

        // 3. Generate JWT Token
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                role: user.role,
                branch: user.branch
            }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        // 4. Send response back
        res.json({
            token,
            user: {
                id: user.id,
                fullName: user.full_name, // Fixed to match your Supabase column
                email: user.email,
                role: user.role,
                branch: user.branch
            }
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Server error during login" });
    }
});

// --- STAFF SIGN UP ROUTE ---
router.post('/signup', async (req, res) => {
    const { 
        fullName, email, phone, branch, password,
        department, unit, supervisor, isLoanOfficer, isSupervisor 
    } = req.body;

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // PostgreSQL uses $1, $2, etc. and matches your Supabase table 'staff_users'
        const query = `
            INSERT INTO staff_users (
                full_name, email, phone_no, password, branch, role, 
                department, unit, supervisor_name, is_loan_officer, is_supervisor
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
        `;

        const params = [
            fullName, email, phone, hashedPassword, branch, 'Officer', 
            department, unit, supervisor, isLoanOfficer ? true : false, isSupervisor ? true : false
        ];

        const result = await db.query(query, params);
        res.status(201).json({ id: result.rows[0].id, message: "Account created successfully" });

    } catch (error) {
        console.error("❌ SIGNUP ERROR:", error.message);
        res.status(500).json({ error: error.message || "Server error during registration" });
    }
});

module.exports = router;