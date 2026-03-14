const express = require('express');
const router = express.Router();
const { db } = require('../server');
const crypto = require('crypto'); // Built-in Node.js module for UUIDs

// --- SUBMIT NEW LOAN APPLICATION ---
router.post('/', async (req, res) => {
    const {
        customerName,
        bvn,
        phone,
        loanAmount,
        loanType,
        bankName,
        accountNumber,
        employerName,
        staffEmail,
        status,
        nin,
        gender,
        monthlyIncome,
        repaymentCycle
    } = req.body;

    // Generate a unique ID for the loan record
    const loanId = crypto.randomUUID();

    try {
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
        await db.query(customerQuery, [customerName, bvn, phone, nin]);

        // 2. Insert into Loans table using the generated loanId
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
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
            RETURNING id;
        `;

        const values = [
            loanId, // Manual ID injection
            customerName,
            bvn,
            loanAmount, 
            loanAmount, 
            loanType,
            bankName,
            accountNumber,
            employerName,
            staffEmail || 'sales_officer@trustmicro.com',
            status || 'Pending',
            nin,
            gender,
            monthlyIncome,
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
        await db.query('ROLLBACK');
        console.error("Loan Submission Error:", error.message);
        res.status(500).json({ 
            error: `Database Error: ${error.message}` 
        });
    }
});

module.exports = router;