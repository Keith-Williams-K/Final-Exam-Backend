const express = require('express');
const router = express.Router();
const { StudyGroup, User, Membership } = require('../models');
const { protect } = require('../middleware/auth');
// @route   POST /api/groups
// @desc    Create a new study group
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { name, course, description, location } = req.body;

        if (!name || !course) {
            return res.status(400).json({ 
                message: 'Group name and course are required' 
            });
        }

        const group = await StudyGroup.create({
            name,
            course,
            description,
            location: location || 'Online',
            leader_id: req.user.id
        });

        // Create membership for leader with APPROVED status
        await Membership.create({
            user_id: req.user.id,
            group_id: group.id,
            role: 'leader',
            status: 'approved'  // ← ADD THIS LINE
        });

        const groupWithDetails = await StudyGroup.findByPk(group.id, {
            include: [
                {
                    model: User,
                    as: 'leader',
                    attributes: ['id', 'name', 'email', 'program']
                }
            ]
        });

        res.status(201).json({
            success: true,
            message: 'Study group created successfully',
            group: groupWithDetails
        });

    } catch (error) {
        console.error('Create group error:', error);
        res.status(500).json({ 
            message: 'Server error' 
        });
    }
});

// @route   GET /api/groups/:id
// @desc    Get single group details
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const group = await StudyGroup.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    as: 'leader',
                    attributes: ['id', 'name', 'email', 'program']
                },
                {
                    model: User,
                    attributes: ['id', 'name', 'program', 'year'],
                    through: { 
                        attributes: ['role', 'status'],
                        where: { status: 'approved' }  // Only approved members
                    },
                    required: false  // ← ADD THIS so group shows even with no members
                }
            ]
        });

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        res.json({ success: true, group });
    } catch (error) {
        console.error('Get group error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/// @route   GET /api/groups
// @desc    Get all study groups
// @access  Public
router.get('/', async (req, res) => {
    try {
        const groups = await StudyGroup.findAll({
            include: [
                {
                    model: User,
                    as: 'leader',
                    attributes: ['id', 'name', 'program']
                },
                {
                    model: User,
                    attributes: ['id'],
                    through: { 
                        attributes: [],
                        where: { status: 'approved' }  // Only count approved members
                    }
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
        console.error('Get groups error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
// @route   PUT /api/groups/:id
// @desc    Update group details
// @access  Private (leader only)
router.put('/:id', protect, async (req, res) => {
    try {
        const group = await StudyGroup.findByPk(req.params.id);

        if (!group) {
            return res.status(404).json({ 
                message: 'Group not found' 
            });
        }

        if (group.leader_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ 
                message: 'Only group leader can update group details' 
            });
        }

        const { name, course, description, location } = req.body;

        await group.update({
            name: name || group.name,
            course: course || group.course,
            description: description || group.description,
            location: location || group.location
        });

        res.json({
            success: true,
            message: 'Group updated successfully',
            group
        });

    } catch (error) {
        console.error('Update group error:', error);
        res.status(500).json({ 
            message: 'Server error' 
        });
    }
});

// @route   DELETE /api/groups/:id
// @desc    Delete group
// @access  Private (leader or admin only)
router.delete('/:id', protect, async (req, res) => {
    try {
        const group = await StudyGroup.findByPk(req.params.id);

        if (!group) {
            return res.status(404).json({ 
                message: 'Group not found' 
            });
        }

        if (group.leader_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ 
                message: 'Not authorized to delete this group' 
            });
        }

        await group.destroy();

        res.json({
            success: true,
            message: 'Group deleted successfully'
        });

    } catch (error) {
        console.error('Delete group error:', error);
        res.status(500).json({ 
            message: 'Server error' 
        });
    }
});

module.exports = router;