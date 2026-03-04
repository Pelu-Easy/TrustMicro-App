// backend/middleware/auth.js

const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    // FIX: Check if authHeader exists before splitting
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) return res.status(401).json({ error: "Access Denied: No Token Provided" });

    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_for_dev_only', (err, decodedUser) => {
        if (err) return res.status(403).json({ error: "Invalid or Expired Token" });
        
        req.user = decodedUser; 
        next();
    });
};

// --- MANAGEMENT MIDDLEWARE ---
const isManagement = (req, res, next) => {
    if (!req.user) {
        return res.status(403).json({ error: "Access Denied: No user data" });
    }

    // Standardize to lowercase and trim spaces for robust comparison
    const role = (req.user.role || "").toLowerCase().trim();
    const unit = (req.user.unit || "").toLowerCase().trim();
    const isSupFlag = req.user.is_supervisor;

    /**
     * UPDATED: Added 'head of control' and 'credit officer' to allowed management units.
     * This ensures the Head of Control can pass the RBAC check for the dashboard.
     */
    const managementUnits = [
        'cco', 
        'md', 
        'head of credit', 
        'head of control', 
        'credit officer', 
        'admin', 
        'super admin', 
        'manager', 
        'supervisor'
    ];
    
    const hasManagementAccess = 
        isSupFlag == 1 || 
        isSupFlag === true || 
        managementUnits.includes(role) ||
        managementUnits.includes(unit);

    console.log(`[AUTH] Checking management access for: ${req.user.email}`);
    console.log(`[AUTH] Role: "${role}" | Unit: "${unit}" | Sup Flag: ${isSupFlag}`);

    if (hasManagementAccess) {
        console.log("[AUTH] Access Granted ✅");
        next();
    } else {
        console.log("[AUTH] Access Denied ❌");
        res.status(403).json({ error: "Access Denied: Management privileges required" });
    }
};

const isSupervisor = (req, res, next) => {
    const role = (req.user.role || "").toLowerCase().trim();
    if (req.user.is_supervisor == 1 || role === 'supervisor' || role === 'manager') {
        next();
    } else {
        res.status(403).json({ error: "Access Denied: Supervisor only" });
    }
};

module.exports = { authenticateToken, isSupervisor, isManagement };