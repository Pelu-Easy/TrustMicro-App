const express = require('express');
const router = express.Router();
const { db } = require('../server'); // Import the PG pool from your server.js

// --- 1. GET ALL LOANS (Manager View) ---
router.get('/all-loans', async (req, res) => {
    try {
        // PostgreSQL uses "quotes" for camelCase column names
        const query = 'SELECT * FROM loans ORDER BY "submittedDate" DESC';
        const result = await db.query(query);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching all loans:', error);
        res.status(500).json({ error: 'Failed to fetch loans from Supabase.' });
    }
});

// --- 2. UPDATE LOAN STATUS (Approve/Reject) ---
router.patch('/update-status/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        // $1 and $2 are used for Postgres placeholders
        const query = 'UPDATE loans SET status = $1 WHERE id = $2 RETURNING *';
        const result = await db.query(query, [status, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Loan not found.' });
        }

        res.json({ message: `Loan status updated to ${status}`, loan: result.rows[0] });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ error: 'Database update failed.' });
    }
});

// --- 3. GET STAFF LIST ---
router.get('/staff-list', async (req, res) => {
    try {
        const result = await db.query('SELECT id, full_name, email, role, branch FROM staff_users');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch staff list.' });
    }
});

module.exports = router;