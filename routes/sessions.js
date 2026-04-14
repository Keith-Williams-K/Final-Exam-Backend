const express = require('express');
const router = express.Router();
const { Session, StudyGroup, User, Membership } = require('../models');
const { protect } = require('../middleware/auth');
const { Op } = require('sequelize');

// @route   POST /api/sessions/:groupId
// @desc    Create a new study session
// @access  Private (leader only)
router.post('/:groupId', protect, async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const { title, date, time, location_link, description } = req.body;

        if (!title || !date || !time) {
            return res.status(400).json({ 
                message: 'Title, date, and time are required' 
            });
        }

        const membership = await Membership.findOne({
            where: { 
                user_id: req.user.id, 
                group_id: groupId, 
                role: 'leader' 
            }
        });

        if (!membership && req.user.role !== 'admin') {
            return res.status(403).json({ 
                message: 'Only group leader can create sessions' 
            });
        }

        const session = await Session.create({
            group_id: groupId,
            title,
            date,
            time,
            location_link: location_link || '',
            description,
            created_by: req.user.id
        });

        res.status(201).json({
            success: true,
            message: 'Study session created successfully',
            session
        });

    } catch (error) {
        console.error('Create session error:', error);
        res.status(500).json({ 
            message: 'Server error' 
        });
    }
});

// @route   GET /api/sessions/group/:groupId
// @desc    Get all sessions for a group
// @access  Private (members only)
router.get('/group/:groupId', protect, async (req, res) => {
    try {
        const groupId = req.params.groupId;

        const membership = await Membership.findOne({
            where: { user_id: req.user.id, group_id: groupId }
        });

        if (!membership && req.user.role !== 'admin') {
            return res.status(403).json({ 
                message: 'You must be a member to view sessions' 
            });
        }

        const sessions = await Session.findAll({
            where: { 
                group_id: groupId,
                date: { [Op.gte]: new Date().toISOString().split('T')[0] }
            },
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'name']
                }
            ],
            order: [['date', 'ASC'], ['time', 'ASC']]
        });

        res.json({
            success: true,
            count: sessions.length,
            sessions
        });

    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ 
            message: 'Server error' 
        });
    }
});

// @route   GET /api/sessions/upcoming
// @desc    Get upcoming sessions for logged-in user
// @access  Private
router.get('/upcoming', protect, async (req, res) => {
    try {
        const memberships = await Membership.findAll({
            where: { user_id: req.user.id },
            attributes: ['group_id']
        });

        const groupIds = memberships.map(m => m.group_id);

        if (groupIds.length === 0) {
            return res.json({ 
                success: true, 
                sessions: [] 
            });
        }

        const sessions = await Session.findAll({
            where: {
                group_id: { [Op.in]: groupIds },
                date: { [Op.gte]: new Date().toISOString().split('T')[0] }
            },
            include: [
                {
                    model: StudyGroup,
                    attributes: ['id', 'name', 'course']
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'name']
                }
            ],
            order: [['date', 'ASC'], ['time', 'ASC']],
            limit: 10
        });

        res.json({
            success: true,
            sessions
        });

    } catch (error) {
        console.error('Get upcoming sessions error:', error);
        res.status(500).json({ 
            message: 'Server error' 
        });
    }
});

module.exports = router;