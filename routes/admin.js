// Admin routes: only accessible by authenticated admin users
const express = require('express');
const router = express.Router();

// Import models used in admin statistics and user listing
const { User, StudyGroup, Session, Post } = require('../models');

// Middleware: `protect` ensures the user is authenticated;
// `admin` checks the user has administrative privileges
const { protect, admin } = require('../middleware/auth');

// Sequelize instance for raw DB functions (COUNT, aggregation)
const sequelize = require('../config/database');

// Apply authentication and authorization middleware to all admin routes
router.use(protect);
router.use(admin);

// @route   GET /api/admin/stats
// @desc    Return aggregated system statistics useful for admin dashboards
// @access  Admin only
router.get('/stats', async (req, res) => {
    try {
        // Simple totals for primary entities
        const totalUsers = await User.count();
        const totalGroups = await StudyGroup.count();
        const totalSessions = await Session.count();
        const totalPosts = await Post.count();

        // Group users by `program` to show distribution across programs
        const usersByProgram = await User.findAll({
            attributes: ['program', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['program']
        });

        // Top courses by number of study groups (limit to top 5)
        const groupsByCourse = await StudyGroup.findAll({
            attributes: ['course', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['course'],
            order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
            limit: 5
        });

        // A small list of recently registered users for quick review
        const recentUsers = await User.findAll({
            limit: 5,
            order: [['created_at', 'DESC']],
            attributes: ['id', 'name', 'email', 'program', 'created_at']
        });

        // Recent study groups including the leader's name (via association)
        const recentGroups = await StudyGroup.findAll({
            limit: 5,
            order: [['created_at', 'DESC']],
            include: [{ model: User, as: 'leader', attributes: ['name'] }]
        });

        // Respond with a structured JSON payload for dashboard consumption
        res.json({
            success: true,
            stats: {
                totalUsers,
                totalGroups,
                totalSessions,
                totalPosts,
                usersByProgram,
                topCourses: groupsByCourse,
                recentUsers,
                recentGroups
            }
        });

    } catch (error) {
        // Log the error for server-side debugging and return a 500
        console.error('Admin stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/users
// @desc    Retrieve all users (excluding password) for admin management
// @access  Admin only
router.get('/users', async (req, res) => {
    try {
        const users = await User.findAll({
            // Exclude sensitive `password` field from returned user records
            attributes: { exclude: ['password'] },
            order: [['created_at', 'DESC']]
        });

        // Return the list and a simple count for convenience
        res.json({
            success: true,
            count: users.length,
            users
        });

    } catch (error) {
        // Log and return a generic server error
        console.error('Admin users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;