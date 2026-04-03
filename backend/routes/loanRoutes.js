const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { calculateRiskScore } = require('../utils/riskEvaluator');

// --- SUBMIT NEW LOAN APPLICATION (Supports Top-Ups) ---
router.post('/', async (req, res) => {
    // We import db inside the route to prevent circular dependency crashes
    const { db } = require('../server'); 

    const {
        firstName,
        lastName,
        middleName,
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
        title,
        monthlyIncome,
        repaymentCycle,
        // New Fields from Updated loanForm.tsx
        clientSector,
        stateOfOrigin,
        lga,
        fullAddress,
        residentialStatus,
        employerState,
        employmentType,
        // Document URLs
        ninImageUrl,
        idImageUrl,
        passportImageUrl,
        utilityBillUrl,
        workIdUrl,
        statementUrl,
        signatureUrl,
        // TOP-UP FIELD: Links this loan to a previous one
        parentLoanId 
    } = req.body;

    // Construct full name for legacy support in database
    const customerName = `${title} ${firstName} ${middleName} ${lastName}`.replace(/\s+/g, ' ').trim();

    // Generate a unique ID
    const loanId = `LOAN-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;

    try {
        if (!db) throw new Error("Database connection not initialized");

        await db.query('BEGIN');

        // 1. Insert/Update Customers table (Updated to include gender/title)
        const customerQuery = `
            INSERT INTO customers (full_name, bvn, phone, nin, gender, kyc_status)
            VALUES ($1, $2, $3, $4, $5, 'Verified')
            ON CONFLICT (bvn) DO UPDATE SET 
                full_name = EXCLUDED.full_name,
                phone = EXCLUDED.phone,
                gender = EXCLUDED.gender
            RETURNING id;
        `;
        await db.query(customerQuery, [customerName, bvn, phone || 'N/A', nin || 'N/A', gender]);

        // 2. Insert into Loans table (Includes parentLoanId for Top-Ups + New Form Fields)
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
                "submittedDate",
                "ninImageUrl",
                "idImageUrl",
                "passportImageUrl",
                "utilityBillUrl",
                "workIdUrl",
                "statementUrl",
                "signatureUrl",
                "parentLoanId",
                "clientSector",
                "stateOfOrigin",
                "lga",
                "fullAddress",
                "residentialStatus",
                "employerState",
                "employmentType"
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
                $11, $12, $13, $14, $15, CURRENT_DATE, 
                $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
            )
            RETURNING id;
        `;

        const values = [
            loanId,
            customerName,
            bvn,
            parseFloat(loanAmount) || 0, 
            parseFloat(loanAmount) || 0, 
            loanType,
            bankName,
            accountNumber,
            employerName || 'N/A',
            staffEmail || 'system@trustmicro.com', 
            status || 'Pending',
            nin,
            gender,
            monthlyIncome || 0,
            repaymentCycle || 'Monthly',
            ninImageUrl || null,
            idImageUrl || null,
            passportImageUrl || null,
            utilityBillUrl || null,
            workIdUrl || null,
            statementUrl || null,
            signatureUrl || null,
            parentLoanId || null,
            clientSector || 'Federal',
            stateOfOrigin || null,
            lga || null,
            fullAddress || null,
            residentialStatus || 'Tenant',
            employerState || null,
            employmentType || null
        ];

        const result = await db.query(loanQuery, values);
        
        await db.query('COMMIT');

        res.status(201).json({
            status: "success",
            message: parentLoanId ? "Top-Up application submitted" : "Loan application saved successfully",
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

// --- GET LOAN HISTORY BY BVN ---
router.get('/history/:bvn', async (req, res) => {
    const { db } = require('../server');
    const { bvn } = req.params;

    try {
        if (!db) throw new Error("Database connection not initialized");

        const query = `
            SELECT 
                id, 
                "loanAmount", 
                status, 
                "submittedDate", 
                "loanType",
                "parentLoanId"
            FROM loans 
            WHERE bvn = $1 
            ORDER BY "submittedDate" DESC;
        `;
        
        const result = await db.query(query, [bvn]);
        
        // Use the utility function to analyze the history
        const riskAnalysis = calculateRiskScore(result.rows);

        res.json({
            status: "success",
            data: result.rows,
            riskAnalysis: riskAnalysis // New field
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;