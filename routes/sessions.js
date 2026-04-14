const express = require('express');
const router = express.Router();
const { Session, StudyGroup, User, Membership } = require('../models');
const { protect } = require('../middleware/auth');
const { Op } = require('sequelize');

// POST /api/sessions/:groupId - Create a session (leader only)
router.post('/:groupId', protect, async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const { title, date, time, location_link, description } = req.body;
        const userId = req.user.id;

        // Validation
        if (!title || !date || !time) {
            return res.status(400).json({ message: 'Title, date, and time are required' });
        }

        // Check if user is group leader
        const membership = await Membership.findOne({
            where: { user_id: userId, group_id: groupId, role: 'leader' }
        });

        if (!membership && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only group leader can create sessions' });
        }

        const session = await Session.create({
            group_id: groupId,
            title,
            date,
            time,
            location_link,
            description,
            created_by: userId
        });

        res.status(201).json({
            success: true,
            message: 'Session created successfully',
            session
        });

    } catch (error) {
        console.error('Create session error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/sessions/group/:groupId - Get all sessions for a group
router.get('/group/:groupId', protect, async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const userId = req.user.id;

        // Check if user is a member
        const membership = await Membership.findOne({
            where: { user_id: userId, group_id: groupId }
        });

        if (!membership && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Must be a member to view sessions' });
        }

        const sessions = await Session.findAll({
            where: { group_id: groupId },
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'name']
                }
            ],
            order: [['date', 'ASC'], ['time', 'ASC']]
        });

        res.json({ success: true, sessions });

    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/sessions/upcoming - Get upcoming sessions for logged-in user
router.get('/upcoming', protect, async (req, res) => {
    try {
        const memberships = await Membership.findAll({
            where: { user_id: req.user.id },
            attributes: ['group_id']
        });

        const groupIds = memberships.map(m => m.group_id);

        if (groupIds.length === 0) {
            return res.json({ success: true, sessions: [] });
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

        res.json({ success: true, sessions });

    } catch (error) {
        console.error('Get upcoming error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/sessions/:sessionId - Delete a session
router.delete('/:sessionId', protect, async (req, res) => {
    try {
        const session = await Session.findByPk(req.params.sessionId, {
            include: [{ model: StudyGroup, attributes: ['leader_id'] }]
        });

        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        const isLeader = session.StudyGroup.leader_id === req.user.id;
        const isCreator = session.created_by === req.user.id;

        if (!isLeader && !isCreator && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await session.destroy();
        res.json({ success: true, message: 'Session deleted' });

    } catch (error) {
        console.error('Delete session error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;