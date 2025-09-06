const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({error: 'UNAUTHENTICATED'});
        }

        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({error: 'UNAUTHENTICATED'});
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        req.user = {
            userId: decoded.userId,
            name: decoded.name || 'Usuario'
        };
        
        next();
    } catch (error) {
        return res.status(401).json({error: 'UNAUTHENTICATED'});
    }
};
