const express = require('express');
const router = express.Router();
const { User, StudyGroup, Session, Post } = require('../models');
const { protect, admin } = require('../middleware/auth');
const sequelize = require('../config/database');

router.use(protect);
router.use(admin);

// @route   GET /api/admin/stats
// @desc    Get system statistics
// @access  Admin only
router.get('/stats', async (req, res) => {
    try {
        const totalUsers = await User.count();
        const totalGroups = await StudyGroup.count();
        const totalSessions = await Session.count();
        const totalPosts = await Post.count();

        const usersByProgram = await User.findAll({
            attributes: ['program', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['program']
        });

        const groupsByCourse = await StudyGroup.findAll({
            attributes: ['course', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['course'],
            order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
            limit: 5
        });

        const recentUsers = await User.findAll({
            limit: 5,
            order: [['created_at', 'DESC']],
            attributes: ['id', 'name', 'email', 'program', 'created_at']
        });

        const recentGroups = await StudyGroup.findAll({
            limit: 5,
            order: [['created_at', 'DESC']],
            include: [{ model: User, as: 'leader', attributes: ['name'] }]
        });

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
        console.error('Admin stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Admin only
router.get('/users', async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] },
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            count: users.length,
            users
        });

    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;