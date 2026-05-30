const calculateRiskScore = (loans) => {
    let score = 0;
    const activeLoans = loans.filter(l => ['Disbursed', 'Approved', 'APPROVED_FINANCE'].includes(l.status));
    const rejectedLoans = loans.filter(l => l.status === 'Rejected');
    
    // 1. Multi-Loan Penalty (The "Velocity" check)
    if (activeLoans.length >= 2) score += 50; 
    else if (activeLoans.length === 1) score += 20;

    // 2. Recent Rejection Penalty (Desperation check - last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRejections = rejectedLoans.filter(l => new Date(l.submittedDate) > thirtyDaysAgo);
    
    if (recentRejections.length >= 2) score += 30;

    // 3. Top-Up Dependency
    const topUpCount = loans.filter(l => l.parentLoanId !== null).length;
    if (topUpCount > 2) score += 15;

    return {
        score: Math.min(score, 100), // Cap at 100
        level: score >= 60 ? 'High' : score >= 30 ? 'Medium' : 'Low',
        activeCount: activeLoans.length
    };
};

module.exports = { calculateRiskScore };