const express = require('express');
const router = express.Router();
const { authenticateToken, isSupervisor } = require('../middleware/auth');

// Using a safer way to access the DB
const db = require('../server').db; 

/**
 * @route   GET /api/v1/manager/supervisors
 */
router.get('/supervisors', (req, res) => {
    const query = "SELECT fullName, email FROM users WHERE role = 'supervisor' OR role = 'manager' OR isSupervisor = 1";
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error("DB Error (supervisors):", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json(rows);
    });
});

/**
 * @route   GET /api/v1/manager/pending
 */
router.get('/pending', authenticateToken, isSupervisor, (req, res) => {
    // Note: Ensure your status column uses 'Pending' with a capital P if that's what you saved
    const query = "SELECT * FROM loans WHERE status = 'Pending' OR status = 'pending' ORDER BY id DESC";
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error("DB Error (pending):", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json(rows || []); // Return empty array if no loans found
    });
});

/**
 * @route   PATCH /api/v1/manager/approve/:id
 */
router.patch('/approve/:id', authenticateToken, isSupervisor, (req, res) => {
    const { id } = req.params;
    const { status } = req.body; 

    if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Use 'Approved' or 'Rejected'" });
    }

    const query = "UPDATE loans SET status = ? WHERE id = ?";
    db.run(query, [status, id], function(err) {
        if (err) {
            console.error("DB Error (approve):", err);
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: "Loan application not found" });
        }

        res.json({ 
            message: `Loan application ${id} has been ${status.toLowerCase()} successfully`,
            loanId: id,
            newStatus: status
        });
    });
});

module.exports = router;