const express = require('express');
const router = express.Router();
const { db } = require('../server'); // Import the PG pool from your server.js
const { Expo } = require('expo-server-sdk');
const expo = new Expo();

// --- MOCK DATABASE FOR BVN VERIFICATION (FOR TESTING SALES TRACKER) ---
const mockBvnData = {
    "12345678901": { fullName: "Adebayo Chukwuma", dob: "1990-05-12", phone: "08012345678" },
    "22222222222": { fullName: "Blessing Okon", dob: "1995-10-20", phone: "08122223333" },
    "33333333333": { fullName: "Ibrahim Musa", dob: "1988-01-15", phone: "09044445555" },
    "44444444444": { fullName: "Chioma Adeleke", dob: "1992-07-30", phone: "07066667777" }
};

// Helper for sending notifications within the router
const sendPushNotification = async (targetExpoToken, title, body, data = {}) => {
    if (!Expo.isExpoPushToken(targetExpoToken)) return;
    try {
        await expo.sendPushNotificationsAsync([{
            to: targetExpoToken,
            sound: 'default',
            title,
            body,
            data,
        }]);
    } catch (error) {
        console.error("Notification delivery error:", error);
    }
};

// --- 1. GET MANAGER DASHBOARD STATS ---
router.get('/loan-stats', async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*)::INT as "totalLoans",
                COUNT(*) FILTER (
                    WHERE status IN (
                        'Pending', 
                        'PENDING_MARKETING',
                        'PENDING_CREDIT', 
                        'PENDING_HEAD_CREDIT', 
                        'PENDING_CONTROL', 
                        'PENDING_CCO', 
                        'PENDING_MD'
                    )
                )::INT as "pendingLoans",
                COUNT(*) FILTER (WHERE status = 'Approved' OR status = 'Disbursed' OR status = 'APPROVED_FINANCE')::INT as "disbursedLoans",
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

// --- 3.1 REACTIVATE STAFF (RESETS FAILED ATTEMPTS) ---
router.post('/reactivate-staff', async (req, res) => {
    const { staffEmail } = req.body;
    if (!staffEmail) return res.status(400).json({ error: "Staff email is required." });

    try {
        const cleanEmail = staffEmail.trim().toLowerCase();
        const query = `
            UPDATE staff_users 
            SET is_active = true, failed_attempts = 0 
            WHERE email = $1 
            RETURNING full_name`;
        
        const result = await db.query(query, [cleanEmail]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Staff user not found." });
        }

        res.json({ message: `Account for ${result.rows[0].full_name} reactivated and login attempts reset.` });
    } catch (error) {
        console.error('Reactivation Error:', error.message);
        res.status(500).json({ error: 'Failed to reactivate staff.' });
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

// --- 5. GET ALL LOANS ---
router.get('/all-loans', async (req, res) => {
    try {
        const query = `
            SELECT 
                id, 
                "customerName" AS "customerName", 
                amount, 
                "loanAmount" AS "loanAmount", 
                status, 
                "submittedDate" AS "submittedDate",
                branch,
                "branchName"
            FROM loans
            ORDER BY "submittedDate" DESC
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching all-loans:', error.message);
        try {
            const fallback = await db.query('SELECT * FROM loans');
            res.json(fallback.rows);
        } catch (innerError) {
            res.status(500).json({ error: 'Database access failed.' });
        }
    }
});

// --- 6. GET SUPERVISORS LIST (STRICTLY BY CHECKBOX) ---
router.get('/supervisors', async (req, res) => {
    try {
        const query = `
            SELECT full_name, email, role, branch 
            FROM staff_users 
            WHERE is_active = true 
            AND role NOT IN ('Sales Officer', 'Loan Officer')
            ORDER BY full_name ASC
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

// --- 8. UPDATE LOAN STATUS (WITH PUSH NOTIFICATIONS) ---
router.patch('/update-status/:id', async (req, res) => {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;
    try {
        const query = `
            UPDATE loans 
            SET status = $1, 
                rejection_reason = $2 
            WHERE id = $3 
            RETURNING *`;
        
        const finalReason = status === 'Rejected' ? rejection_reason : null;
        const result = await db.query(query, [status, finalReason, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Loan not found.' });
        }

        const updatedLoan = result.rows[0];

        // --- PUSH NOTIFICATION LOGIC ---
        const staffRes = await db.query(
            "SELECT id, push_token FROM staff_users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))",
            [updatedLoan.createdByEmail]
        );

        if (staffRes.rows[0]) {
            const staff = staffRes.rows[0];
            const title = `Loan Journey Update 📢`;
            const cleanStatus = status.replace(/_/g, ' ');
            const body = `Your loan application for ${updatedLoan.customerName} has moved to: ${cleanStatus}`;

            // Save to Notification History
            await db.query(
                "INSERT INTO notification_history (user_id, title, body) VALUES ($1, $2, $3)",
                [staff.id, title, body]
            );

            // Send Real-time Push
            if (staff.push_token) {
                sendPushNotification(staff.push_token, title, body, { 
                    loanId: updatedLoan.id, 
                    type: 'STATUS_UPDATE',
                    status: status 
                });
            }
        }

        res.json({ message: `Loan status updated to ${status}`, loan: updatedLoan });
    } catch (error) {
        console.error('Error updating status:', error.message);
        res.status(500).json({ error: 'Database update failed.' });
    }
});

// --- 9. GET ALL CUSTOMERS ---
router.get('/customers', async (req, res) => {
    try {
        const query = `
            SELECT id, full_name, bvn, kyc_status, created_at 
            FROM customers 
            ORDER BY created_at DESC
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching customers:', error.message);
        res.status(500).json({ error: 'Failed to fetch customers list.' });
    }
});

// --- 10. GET LOAN HISTORY BY BVN ---
router.get('/customer-loans/:bvn', async (req, res) => {
    const { bvn } = req.params;
    try {
        const query = `
            SELECT 
                id, 
                "loanType", 
                amount AS "loanAmount", 
                status, 
                "submittedDate" 
            FROM loans 
            WHERE "customerBVN" = $1 
            ORDER BY "submittedDate" DESC
        `;
        const result = await db.query(query, [bvn]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching customer loan history:', error.message);
        res.status(500).json({ error: 'Failed to fetch loan history.' });
    }
});

// --- 11. NEW: MOCK BVN VERIFICATION ROUTE ---
router.post('/verify-bvn', async (req, res) => {
    const { bvn } = req.body;
    if (!bvn || bvn.length !== 11) {
        return res.status(400).json({ status: "error", message: "Invalid BVN length" });
    }
    const customer = mockBvnData[bvn];
    if (customer) {
        return res.json({
            status: "success",
            message: "BVN Verified Successfully",
            data: {
                fullName: customer.fullName,
                bvn: bvn,
                dateOfBirth: customer.dob,
                phoneNumber: customer.phone
            }
        });
    } else {
        res.status(404).json({ 
            status: "error", 
            message: "BVN not found in registry. Please use a registered test BVN." 
        });
    }
});

module.exports = router;

// const express = require('express');
// const router = express.Router();
// const { db } = require('../server'); // Import the PG pool from your server.js
// const { Expo } = require('expo-server-sdk');
// const expo = new Expo();

// // Helper for sending notifications within the router
// const sendPushNotification = async (targetExpoToken, title, body, data = {}) => {
//     if (!Expo.isExpoPushToken(targetExpoToken)) return;
//     try {
//         await expo.sendPushNotificationsAsync([{
//             to: targetExpoToken,
//             sound: 'default',
//             title,
//             body,
//             data,
//         }]);
//     } catch (error) {
//         console.error("Notification delivery error:", error);
//     }
// };

// // --- 1. GET MANAGER DASHBOARD STATS ---
// router.get('/loan-stats', async (req, res) => {
//     try {
//         const statsQuery = `
//             SELECT 
//                 COUNT(*)::INT as "totalLoans",
//                 COUNT(*) FILTER (
//                     WHERE status IN (
//                         'Pending', 
//                         'PENDING_MARKETING',
//                         'PENDING_CREDIT', 
//                         'PENDING_HEAD_CREDIT', 
//                         'PENDING_CONTROL', 
//                         'PENDING_CCO', 
//                         'PENDING_MD'
//                     )
//                 )::INT as "pendingLoans",
//                 COUNT(*) FILTER (WHERE status = 'Approved' OR status = 'Disbursed' OR status = 'APPROVED_FINANCE')::INT as "disbursedLoans",
//                 SUM(CAST(COALESCE(amount, '0') AS NUMERIC)) as "totalVolume"
//             FROM loans
//         `;
//         const result = await db.query(statsQuery);
//         const stats = result.rows[0];

//         res.json({
//             totalLoans: stats.totalLoans || 0,
//             pendingLoans: stats.pendingLoans || 0,
//             disbursedLoans: stats.disbursedLoans || 0,
//             totalVolume: parseFloat(stats.totalVolume) || 0
//         });
//     } catch (error) {
//         console.error('Error fetching loan-stats:', error.message);
//         res.status(500).json({ error: 'Failed to fetch dashboard statistics.' });
//     }
// });

// // Alias for 'stats' to ensure backward compatibility
// router.get('/stats', async (req, res) => {
//     res.redirect(301, '/api/v1/manager/loan-stats');
// });

// // --- 2. BRANCH PERFORMANCE SUMMARY ---
// router.get('/branch-summary', async (req, res) => {
//     try {
//         const query = `
//             SELECT 
//                 COALESCE(s.branch, 'Unknown') as branch, 
//                 COUNT(l.id)::INT as "loanCount", 
//                 SUM(CAST(COALESCE(l.amount, '0') AS NUMERIC)) as "totalAmount"
//             FROM staff_users s
//             JOIN loans l ON s.email = l."createdByEmail"
//             GROUP BY s.branch
//             ORDER BY "totalAmount" DESC
//         `;
//         const result = await db.query(query);
//         res.json(result.rows);
//     } catch (error) {
//         console.error('Error fetching branch summary:', error.message);
//         res.status(500).json({ error: 'Failed to fetch branch summary.' });
//     }
// });

// // --- 3. DEACTIVATE STAFF ---
// router.patch('/deactivate-staff/:id', async (req, res) => {
//     const { id } = req.params;
//     const { isActive } = req.body; 
//     try {
//         const query = 'UPDATE staff_users SET is_active = $1 WHERE id = $2 RETURNING *';
//         await db.query(query, [isActive, id]);
        
//         const statusText = isActive ? "activated" : "deactivated";
//         res.json({ message: `Staff account ${statusText} successfully.` });
//     } catch (error) {
//         res.status(500).json({ error: 'Failed to update staff status.' });
//     }
// });

// // --- 3.1 REACTIVATE STAFF (RESETS FAILED ATTEMPTS) ---
// router.post('/reactivate-staff', async (req, res) => {
//     const { staffEmail } = req.body;
//     if (!staffEmail) return res.status(400).json({ error: "Staff email is required." });

//     try {
//         const cleanEmail = staffEmail.trim().toLowerCase();
//         const query = `
//             UPDATE staff_users 
//             SET is_active = true, failed_attempts = 0 
//             WHERE email = $1 
//             RETURNING full_name`;
        
//         const result = await db.query(query, [cleanEmail]);

//         if (result.rowCount === 0) {
//             return res.status(404).json({ error: "Staff user not found." });
//         }

//         res.json({ message: `Account for ${result.rows[0].full_name} reactivated and login attempts reset.` });
//     } catch (error) {
//         console.error('Reactivation Error:', error.message);
//         res.status(500).json({ error: 'Failed to reactivate staff.' });
//     }
// });

// // --- 4. DELETE STAFF ---
// router.delete('/delete-staff/:id', async (req, res) => {
//     const { id } = req.params;
//     try {
//         await db.query('DELETE FROM staff_users WHERE id = $1', [id]);
//         res.json({ message: "Staff account permanently deleted." });
//     } catch (error) {
//         res.status(500).json({ error: 'Hard delete failed.' });
//     }
// });

// // --- 5. GET ALL LOANS ---
// router.get('/all-loans', async (req, res) => {
//     try {
//         const query = `
//             SELECT 
//                 id, 
//                 "customerName" AS "customerName", 
//                 amount, 
//                 "loanAmount" AS "loanAmount", 
//                 status, 
//                 "submittedDate" AS "submittedDate",
//                 branch,
//                 "branchName"
//             FROM loans
//             ORDER BY "submittedDate" DESC
//         `;
//         const result = await db.query(query);
//         res.json(result.rows);
//     } catch (error) {
//         console.error('Error fetching all-loans:', error.message);
//         try {
//             const fallback = await db.query('SELECT * FROM loans');
//             res.json(fallback.rows);
//         } catch (innerError) {
//             res.status(500).json({ error: 'Database access failed.' });
//         }
//     }
// });

// // --- 6. GET SUPERVISORS LIST (STRICTLY BY CHECKBOX) ---
// router.get('/supervisors', async (req, res) => {
//     try {
//         const query = `
//             SELECT full_name, email, role, branch 
//             FROM staff_users 
//             WHERE is_active = true 
//             AND role NOT IN ('Sales Officer', 'Loan Officer')
//             ORDER BY full_name ASC
//         `;
//         const result = await db.query(query);
//         res.json(result.rows);
//     } catch (error) {
//         console.error('Error fetching supervisors:', error.message);
//         res.status(500).json({ error: 'Failed to fetch supervisors list.' });
//     }
// });

// // --- 7. GET ALL STAFF ---
// router.get('/staff-list', async (req, res) => {
//     try {
//         const result = await db.query('SELECT id, full_name, email, role, branch, is_active FROM staff_users');
//         res.json(result.rows);
//     } catch (error) {
//         res.status(500).json({ error: 'Failed to fetch staff list.' });
//     }
// });

// // --- 8. UPDATE LOAN STATUS (WITH PUSH NOTIFICATIONS) ---
// router.patch('/update-status/:id', async (req, res) => {
//     const { id } = req.params;
//     const { status, rejection_reason } = req.body;
//     try {
//         const query = `
//             UPDATE loans 
//             SET status = $1, 
//                 rejection_reason = $2 
//             WHERE id = $3 
//             RETURNING *`;
        
//         const finalReason = status === 'Rejected' ? rejection_reason : null;
//         const result = await db.query(query, [status, finalReason, id]);

//         if (result.rowCount === 0) {
//             return res.status(404).json({ error: 'Loan not found.' });
//         }

//         const updatedLoan = result.rows[0];

//         // --- PUSH NOTIFICATION LOGIC ---
//         const staffRes = await db.query(
//             "SELECT id, push_token FROM staff_users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))",
//             [updatedLoan.createdByEmail]
//         );

//         if (staffRes.rows[0]) {
//             const staff = staffRes.rows[0];
//             const title = `Loan Journey Update 📢`;
//             const cleanStatus = status.replace(/_/g, ' ');
//             const body = `Your loan application for ${updatedLoan.customerName} has moved to: ${cleanStatus}`;

//             // Save to Notification History
//             await db.query(
//                 "INSERT INTO notification_history (user_id, title, body) VALUES ($1, $2, $3)",
//                 [staff.id, title, body]
//             );

//             // Send Real-time Push
//             if (staff.push_token) {
//                 sendPushNotification(staff.push_token, title, body, { 
//                     loanId: updatedLoan.id, 
//                     type: 'STATUS_UPDATE',
//                     status: status 
//                 });
//             }
//         }

//         res.json({ message: `Loan status updated to ${status}`, loan: updatedLoan });
//     } catch (error) {
//         console.error('Error updating status:', error.message);
//         res.status(500).json({ error: 'Database update failed.' });
//     }
// });

// // --- 9. GET ALL CUSTOMERS ---
// router.get('/customers', async (req, res) => {
//     try {
//         const query = `
//             SELECT id, full_name, bvn, kyc_status, created_at 
//             FROM customers 
//             ORDER BY created_at DESC
//         `;
//         const result = await db.query(query);
//         res.json(result.rows);
//     } catch (error) {
//         console.error('Error fetching customers:', error.message);
//         res.status(500).json({ error: 'Failed to fetch customers list.' });
//     }
// });

// // --- 10. GET LOAN HISTORY BY BVN ---
// router.get('/customer-loans/:bvn', async (req, res) => {
//     const { bvn } = req.params;
//     try {
//         const query = `
//             SELECT 
//                 id, 
//                 "loanType", 
//                 amount AS "loanAmount", 
//                 status, 
//                 "submittedDate" 
//             FROM loans 
//             WHERE "customerBVN" = $1 
//             ORDER BY "submittedDate" DESC
//         `;
//         const result = await db.query(query, [bvn]);
//         res.json(result.rows);
//     } catch (error) {
//         console.error('Error fetching customer loan history:', error.message);
//         res.status(500).json({ error: 'Failed to fetch loan history.' });
//     }
// });

// module.exports = router;