// Authentication middleware for JWT token verification and admin access control
const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Middleware to protect routes by verifying JWT token
const protect = async (req, res, next) => {
    let token;

    // Check if Authorization header exists and starts with 'Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extract token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token with secret key
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Find user by ID from token payload, exclude password
            req.user = await User.findByPk(decoded.id, {
                attributes: { exclude: ['password'] }
            });

            // Check if user exists
            if (!req.user) {
                return res.status(401).json({ message: 'User not found' });
            }

            next(); // Proceed to next middleware/route
        } catch (error) {
            console.error('Auth error:', error.message);
            
            // Handle specific JWT errors
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: 'Invalid token' });
            }
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired' });
            }
            
            return res.status(401).json({ message: 'Not authorized' });
        }
    } else {
        return res.status(401).json({ message: 'No token provided' });
    }
};

// Middleware to check if user has admin role
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next(); // User is admin, proceed
    } else {
        res.status(403).json({ message: 'Admin access required' });
    }
};

// Export middleware functions
module.exports = { protect, admin };