const express = require('express');
const router = express.Router();
const { db } = require('../server'); // Import the PG pool from your server.js

// --- 1. GET MANAGER DASHBOARD STATS ---
router.get('/stats', async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) as "totalLoans",
                COUNT(*) FILTER (WHERE status = 'Pending') as "pendingLoans",
                COUNT(*) FILTER (WHERE status = 'Approved') as "approvedLoans",
                SUM(CAST(amount AS NUMERIC)) as "totalVolume"
            FROM loans
        `;
        const result = await db.query(statsQuery);
        const stats = result.rows[0];

        res.json({
            totalLoans: parseInt(stats.totalLoans) || 0,
            pendingLoans: parseInt(stats.pendingLoans) || 0,
            approvedLoans: parseInt(stats.approvedLoans) || 0,
            totalVolume: parseFloat(stats.totalVolume) || 0
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics.' });
    }
});

// --- 2. GET ALL LOANS (Full Manager View) ---
router.get('/all-loans', async (req, res) => {
    try {
        const query = 'SELECT * FROM loans ORDER BY "submittedDate" DESC';
        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching all loans:', error);
        res.status(500).json({ error: 'Failed to fetch loans.' });
    }
});

// --- 3. GET SUPERVISORS LIST ---
router.get('/supervisors', async (req, res) => {
    try {
        // Querying based on your staff_users table roles
        const query = `
            SELECT full_name, email, role, branch 
            FROM staff_users 
            WHERE role = $1 OR role = $2
        `;
        const result = await db.query(query, ['Supervisor', 'Manager']);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching supervisors:', error);
        res.status(500).json({ error: 'Failed to fetch supervisors list.' });
    }
});

// --- 4. GET ALL STAFF (Staff Management) ---
router.get('/staff-list', async (req, res) => {
    try {
        const result = await db.query('SELECT id, full_name, email, role, branch FROM staff_users');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch staff list.' });
    }
});

// --- 5. UPDATE LOAN STATUS (Approve/Reject) ---
router.patch('/update-status/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
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

module.exports = router;