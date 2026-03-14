const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// --- SUBMIT NEW LOAN APPLICATION ---
router.post('/', async (req, res) => {
    // We import db inside the route to prevent circular dependency crashes
    const { db } = require('../server'); 

    const {
        customerName,
        bvn,
        phone,
        loanAmount,
        loanType,
        bankName,
        accountNumber,
        employerName,
        staffEmail, // This comes from your frontend
        status,
        nin,
        gender,
        monthlyIncome,
        repaymentCycle
    } = req.body;

    // Generate a unique ID
    const loanId = `LOAN-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;

    try {
        if (!db) throw new Error("Database connection not initialized");

        await db.query('BEGIN');

        // 1. Insert/Update Customers table 
        const customerQuery = `
            INSERT INTO customers (full_name, bvn, phone, nin, kyc_status)
            VALUES ($1, $2, $3, $4, 'Verified')
            ON CONFLICT (bvn) DO UPDATE SET 
                full_name = EXCLUDED.full_name,
                phone = EXCLUDED.phone
            RETURNING id;
        `;
        await db.query(customerQuery, [customerName, bvn, phone || 'N/A', nin || 'N/A']);

        // 2. Insert into Loans table
        const loanQuery = `
            INSERT INTO loans (
                "id",
                "customerName", 
                "bvn", 
                "amount", 
                "loanAmount", 
                "loanType", 
                "bankName", 
                "accountNumber", 
                "employerName", 
                "createdByEmail",
                "status",
                "nin",
                "gender",
                "monthlyIncome",
                "repaymentCycle",
                "submittedDate"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_DATE)
            RETURNING id;
        `;

        const values = [
            loanId,
            customerName,
            bvn,
            parseFloat(loanAmount), 
            parseFloat(loanAmount), 
            loanType,
            bankName,
            accountNumber,
            employerName || 'N/A',
            staffEmail || 'system@trustmicro.com', // Maps to createdByEmail
            status || 'Pending',
            nin,
            gender,
            monthlyIncome || 0,
            repaymentCycle
        ];

        const result = await db.query(loanQuery, values);
        
        await db.query('COMMIT');

        res.status(201).json({
            status: "success",
            message: "Loan application saved successfully",
            loanId: result.rows[0].id
        });

    } catch (error) {
        if (db) await db.query('ROLLBACK');
        console.error("Loan Submission Error:", error.message);
        res.status(500).json({ 
            error: `Database Error: ${error.message}` 
        });
    }
});

module.exports = router;