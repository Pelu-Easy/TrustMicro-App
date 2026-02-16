const express = require('express');
const router = express.Router();
const { db } = require('../server'); // Import the PG pool from your server.js

// --- 1. GET MANAGER DASHBOARD STATS ---
router.get('/loan-stats', async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) as "totalLoans",
                COUNT(*) FILTER (WHERE status = 'Pending') as "pendingLoans",
                COUNT(*) FILTER (WHERE status = 'Approved' OR status = 'Disbursed') as "disbursedLoans",
                SUM(CAST(COALESCE(amount, '0') AS NUMERIC)) as "totalVolume"
            FROM loans
        `;
        const result = await db.query(statsQuery);
        const stats = result.rows[0];

        res.json({
            totalLoans: parseInt(stats.totalLoans) || 0,
            pendingLoans: parseInt(stats.pendingLoans) || 0,
            disbursedLoans: parseInt(stats.disbursedLoans) || 0,
            totalVolume: parseFloat(stats.totalVolume) || 0
        });
    } catch (error) {
        console.error('Error fetching loan-stats:', error);
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
                COALESCE(branch, 'Unknown') as branch, 
                COUNT(*) as "loanCount", 
                SUM(CAST(COALESCE(amount, '0') AS NUMERIC)) as "totalAmount"
            FROM staff_users
            JOIN loans ON staff_users.email = loans."createdByEmail"
            GROUP BY branch
            ORDER BY "totalAmount" DESC
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching branch summary:', error);
        res.status(500).json({ error: 'Failed to fetch branch summary.' });
    }
});

// --- 3. DEACTIVATE STAFF (Manager/Admin Power) ---
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

// --- 4. DELETE STAFF (Super Admin Power ONLY) ---
router.delete('/delete-staff/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM staff_users WHERE id = $1', [id]);
        res.json({ message: "Staff account permanently deleted." });
    } catch (error) {
        res.status(500).json({ error: 'Hard delete failed.' });
    }
});

// --- 5. GET ALL LOANS (Full Manager View) ---
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

// --- 6. GET SUPERVISORS LIST (Expanded Roles) ---
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
        console.error('Error fetching supervisors:', error);
        res.status(500).json({ error: 'Failed to fetch supervisors list.' });
    }
});

// --- 7. GET ALL STAFF (Including active status) ---
router.get('/staff-list', async (req, res) => {
    try {
        const result = await db.query('SELECT id, full_name, email, role, branch, is_active FROM staff_users');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch staff list.' });
    }
});

// --- 8. UPDATE LOAN STATUS (Approve/Reject) ---
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