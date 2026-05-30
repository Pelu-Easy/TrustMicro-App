// backend/middleware/auth.js

const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    // Check if authHeader exists before splitting
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

    /**
     * LOGIC FIX: Instead of looking for a 'supervisor' checkbox/column,
     * we grant access based on the Staff Role or Unit name.
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
        managementUnits.includes(role) ||
        managementUnits.includes(unit);

    console.log(`[AUTH] Checking management access for: ${req.user.email}`);
    console.log(`[AUTH] Role: "${role}" | Unit: "${unit}"`);

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
    const unit = (req.user.unit || "").toLowerCase().trim();
    
    // Define which roles are allowed to perform supervisor actions
    const supervisorRoles = ['supervisor', 'manager', 'head of control', 'head of credit', 'cco', 'md'];
    
    if (supervisorRoles.includes(role) || supervisorRoles.includes(unit)) {
        next();
    } else {
        res.status(403).json({ error: "Access Denied: Supervisor only" });
    }
};

module.exports = { authenticateToken, isSupervisor, isManagement };