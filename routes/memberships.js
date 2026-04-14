const express = require('express');
const router = express.Router();
const { Membership, StudyGroup, User } = require('../models');
const { protect } = require('../middleware/auth');
const { Op } = require('sequelize');

// @route   POST /api/memberships/join/:groupId
// @desc    Join a study group
// @access  Private
router.post('/join/:groupId', protect, async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const userId = req.user.id;

        const group = await StudyGroup.findByPk(groupId);
        if (!group) {
            return res.status(404).json({ 
                message: 'Group not found' 
            });
        }

        const existingMembership = await Membership.findOne({
            where: { user_id: userId, group_id: groupId }
        });

        if (existingMembership) {
            return res.status(400).json({ 
                message: 'Already a member of this group' 
            });
        }

        await Membership.create({
            user_id: userId,
            group_id: groupId,
            role: 'member'
        });

        res.json({
            success: true,
            message: 'Successfully joined the group'
        });

    } catch (error) {
        console.error('Join group error:', error);
        res.status(500).json({ 
            message: 'Server error' 
        });
    }
});

// @route   DELETE /api/memberships/leave/:groupId
// @desc    Leave a study group
// @access  Private
router.delete('/leave/:groupId', protect, async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const userId = req.user.id;

        const membership = await Membership.findOne({
            where: { user_id: userId, group_id: groupId }
        });

        if (!membership) {
            return res.status(404).json({ 
                message: 'Not a member of this group' 
            });
        }

        if (membership.role === 'leader') {
            return res.status(400).json({ 
                message: 'Group leader cannot leave. Transfer leadership or delete the group.' 
            });
        }

        await membership.destroy();

        res.json({
            success: true,
            message: 'Successfully left the group'
        });

    } catch (error) {
        console.error('Leave group error:', error);
        res.status(500).json({ 
            message: 'Server error' 
        });
    }
});

// @route   GET /api/memberships/my-groups
// @desc    Get groups the current user is a member of
// @access  Private
router.get('/my-groups', protect, async (req, res) => {
    try {
        const memberships = await Membership.findAll({
            where: { user_id: req.user.id },
            include: [
                {
                    model: StudyGroup,
                    include: [
                        {
                            model: User,
                            as: 'leader',
                            attributes: ['id', 'name']
                        }
                    ]
                }
            ]
        });

        const groups = memberships.map(m => m.StudyGroup);

        res.json({
            success: true,
            count: groups.length,
            groups
        });

    } catch (error) {
        console.error('Get my groups error:', error);
        res.status(500).json({ 
            message: 'Server error' 
        });
    }
});

// @route   GET /api/groups/search
// @desc    Search and filter groups
// @access  Public
router.get('/search', async (req, res) => {
    try {
        const { query, course } = req.query;
        
        let whereClause = {};

        if (query) {
            whereClause[Op.or] = [
                { name: { [Op.like]: `%${query}%` } },
                { course: { [Op.like]: `%${query}%` } },
                { description: { [Op.like]: `%${query}%` } }
            ];
        }

        if (course) {
            whereClause.course = { [Op.like]: `%${course}%` };
        }

        const groups = await StudyGroup.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'leader',
                    attributes: ['id', 'name', 'program']
                },
                {
                    model: User,
                    attributes: ['id']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        const groupsWithCount = groups.map(group => {
            const groupJSON = group.toJSON();
            groupJSON.memberCount = groupJSON.Users?.length || 0;
            delete groupJSON.Users;
            return groupJSON;
        });

        res.json({
            success: true,
            count: groups.length,
            groups: groupsWithCount
        });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ 
            message: 'Server error' 
        });
    }
});

module.exports = router;