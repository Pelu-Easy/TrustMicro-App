const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Access Denied: No Token Provided" });

    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_for_dev_only', (err, decodedUser) => {
        if (err) return res.status(403).json({ error: "Invalid or Expired Token" });
        
        req.user = decodedUser; 
        next();
    });
};

const isSupervisor = (req, res, next) => {
    if (!req.user) {
        return res.status(403).json({ error: "Access Denied: No user data" });
    }

    // Convert everything to lowercase and strings for safe comparison
    const role = (req.user.role || "").toLowerCase();
    const isSupFlag = req.user.is_supervisor; // Could be 1, "1", true, etc.

    console.log(`[AUTH] Checking access for: ${req.user.email}`);
    console.log(`[AUTH] User Role: "${role}" | Supervisor Flag: ${isSupFlag}`);

    if (
        isSupFlag == 1 || 
        isSupFlag === true || 
        role === 'manager' || 
        role === 'supervisor'
    ) {
        console.log("[AUTH] Access Granted ✅");
        next();
    } else {
        console.log("[AUTH] Access Denied ❌");
        res.status(403).json({ 
            error: "Access Denied: Supervisor privileges required",
            debug: { role, isSupFlag } 
        });
    }
};

module.exports = { authenticateToken, isSupervisor };
