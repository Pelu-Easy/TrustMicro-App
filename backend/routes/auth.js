const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import the PG database connection from your main server file
const { db } = require('../server'); 
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

// --- CHECK PHONE UNIQUE ROUTE ---
// Used by the frontend during signup to prevent duplicate staff numbers
router.get('/check-phone/:phone', async (req, res) => {
    try {
        const { phone } = req.params;
        const query = "SELECT id FROM staff_users WHERE phone_no = $1";
        const result = await db.query(query, [phone.trim()]);

        if (result.rows.length > 0) {
            return res.status(200).json({ exists: true });
        }
        res.status(200).json({ exists: false });
    } catch (error) {
        console.error("Phone Check Error:", error);
        res.status(500).json({ error: "Database error checking phone number" });
    }
});

// --- STAFF LOGIN ROUTE ---
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const query = "SELECT * FROM staff_users WHERE email = $1";
        const result = await db.query(query, [email.trim().toLowerCase()]);
        const user = result.rows[0];

        if (!user) return res.status(401).json({ error: "Invalid email or password" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: "Invalid email or password" });

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

        res.json({
            token,
            user: {
                id: user.id,
                fullName: user.full_name,
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
    // These keys now match the 'api.post' body from your TrustMicro frontend
    const { 
        full_name, email, phone_no, branch, password,
        department, unit, supervisor_name, is_loan_officer, role 
    } = req.body;

    try {
        // 1. Double check phone uniqueness at the database level
        const checkQuery = "SELECT id FROM staff_users WHERE phone_no = $1";
        const checkResult = await db.query(checkQuery, [phone_no]);
        if (checkResult.rows.length > 0) {
            return res.status(400).json({ error: "Phone number already registered" });
        }

        // 2. Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Insert into staff_users
        const query = `
            INSERT INTO staff_users (
                full_name, email, phone_no, password, branch, role, 
                department, unit, supervisor_name, is_loan_officer, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
        `;

        const params = [
            full_name, 
            email.trim().toLowerCase(), 
            phone_no, 
            hashedPassword, 
            branch, 
            role || 'Officer', 
            department, 
            unit, 
            supervisor_name, 
            is_loan_officer === true, 
            true // is_active
        ];

        const result = await db.query(query, params);
        res.status(201).json({ id: result.rows[0].id, message: "Account created successfully" });

    } catch (error) {
        console.error("❌ SIGNUP ERROR:", error.message);
        res.status(500).json({ error: error.message || "Server error during registration" });
    }
});

module.exports = router;