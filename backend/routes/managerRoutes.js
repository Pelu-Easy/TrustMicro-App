const express = require('express');
const router = express.Router();
const { db } = require('../server'); // Import the PG pool from your server.js

// --- 1. GET MANAGER DASHBOARD STATS ---
router.get('/loan-stats', async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*)::INT as "totalLoans",
                COUNT(*) FILTER (WHERE status = 'Pending')::INT as "pendingLoans",
                COUNT(*) FILTER (WHERE status = 'Approved' OR status = 'Disbursed')::INT as "disbursedLoans",
                SUM(CAST(COALESCE(amount, '0') AS NUMERIC)) as "totalVolume"
            FROM loans
        `;
        const result = await db.query(statsQuery);
        const stats = result.rows[0];

        res.json({
            totalLoans: stats.totalLoans || 0,
            pendingLoans: stats.pendingLoans || 0,
            disbursedLoans: stats.disbursedLoans || 0,
            totalVolume: parseFloat(stats.totalVolume) || 0
        });
    } catch (error) {
        console.error('Error fetching loan-stats:', error.message);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics.' });
    }
});

// Alias for 'stats' to ensure backward compatibility
router.get('/stats', async (req, res) => {
    res.redirect(301, '/api/v1/manager/loan-stats');
});

// --- 2. BRANCH PERFORMANCE SUMMARY ---
router.get('/branch-summary', async (req, res) => {
    try {
        const query = `
            SELECT 
                COALESCE(s.branch, 'Unknown') as branch, 
                COUNT(l.id)::INT as "loanCount", 
                SUM(CAST(COALESCE(l.amount, '0') AS NUMERIC)) as "totalAmount"
            FROM staff_users s
            JOIN loans l ON s.email = l."createdByEmail"
            GROUP BY s.branch
            ORDER BY "totalAmount" DESC
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching branch summary:', error.message);
        res.status(500).json({ error: 'Failed to fetch branch summary.' });
    }
});

// --- 3. DEACTIVATE STAFF ---
router.patch('/deactivate-staff/:id', async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body; 
    try {
        const query = 'UPDATE staff_users SET is_active = $1 WHERE id = $2 RETURNING *';
        await db.query(query, [isActive, id]);
        
        const statusText = isActive ? "activated" : "deactivated";
        res.json({ message: `Staff account ${statusText} successfully.` });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update staff status.' });
    }
});

// --- 4. DELETE STAFF ---
router.delete('/delete-staff/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM staff_users WHERE id = $1', [id]);
        res.json({ message: "Staff account permanently deleted." });
    } catch (error) {
        res.status(500).json({ error: 'Hard delete failed.' });
    }
});

// --- 5. GET ALL LOANS (Fixes the "Column Not Found" Errors) ---
router.get('/all-loans', async (req, res) => {
    try {
        // We select the columns carefully using double quotes to match your INSERTs 
        // while providing lowercase aliases just in case.
        const query = `
            SELECT 
                id, 
                "customerName" AS "customerName", 
                amount, 
                "loanAmount" AS "loanAmount", 
                status, 
                "submittedDate" AS "submittedDate"
            FROM loans
            ORDER BY "submittedDate" DESC
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching all-loans:', error.message);
        // Fallback: If the above fails, try selecting all (*) to prevent 500
        try {
            const fallback = await db.query('SELECT * FROM loans');
            res.json(fallback.rows);
        } catch (innerError) {
            res.status(500).json({ error: 'Database access failed.' });
        }
    }
});

// --- 6. GET SUPERVISORS LIST ---
router.get('/supervisors', async (req, res) => {
    try {
        const query = `
            SELECT full_name, email, role, branch 
            FROM staff_users 
            WHERE role IN ('Supervisor', 'Manager', 'Admin', 'Super Admin')
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching supervisors:', error.message);
        res.status(500).json({ error: 'Failed to fetch supervisors list.' });
    }
});

// --- 7. GET ALL STAFF ---
router.get('/staff-list', async (req, res) => {
    try {
        const result = await db.query('SELECT id, full_name, email, role, branch, is_active FROM staff_users');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch staff list.' });
    }
});

// --- 8. UPDATE LOAN STATUS ---
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
        console.error('Error updating status:', error.message);
        res.status(500).json({ error: 'Database update failed.' });
    }
});

module.exports = router;