const express = require('express');
const router = express.Router();
const { Membership, StudyGroup, User } = require('../models');
const { protect } = require('../middleware/auth');
const { Op } = require('sequelize');

// POST /api/memberships/join/:groupId - Request to join (status = pending)
router.post('/join/:groupId', protect, async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const userId = req.user.id;

        const group = await StudyGroup.findByPk(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        const existing = await Membership.findOne({
            where: { user_id: userId, group_id: groupId }
        });

        if (existing) {
            if (existing.status === 'pending') {
                return res.status(400).json({ message: 'Your request is pending approval' });
            }
            if (existing.status === 'approved') {
                return res.status(400).json({ message: 'Already a member' });
            }
            if (existing.status === 'rejected') {
                // Allow re-request if rejected
                await existing.update({ status: 'pending' });
                return res.json({ success: true, message: 'Join request sent for approval' });
            }
        }

        await Membership.create({
            user_id: userId,
            group_id: groupId,
            role: 'member',
            status: 'pending'
        });

        res.json({ success: true, message: 'Join request sent! Waiting for leader approval.' });
    } catch (error) {
        console.error('Join error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/memberships/approve/:groupId/:userId - Approve member (leader only)
router.put('/approve/:groupId/:userId', protect, async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId);
        const userId = parseInt(req.params.userId);
        const leaderId = req.user.id;

        console.log('Approve request:', { groupId, userId, leaderId });

        // Get the group to check leader
        const group = await StudyGroup.findByPk(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if requester is group leader (from study_groups table)
        if (group.leader_id !== leaderId && req.user.role !== 'admin') {
            return res.status(403).json({ 
                message: 'Only group leader can approve members',
                debug: { leaderId, groupLeaderId: group.leader_id }
            });
        }

        // Find the membership
        const membership = await Membership.findOne({
            where: { user_id: userId, group_id: groupId }
        });

        if (!membership) {
            return res.status(404).json({ message: 'Join request not found' });
        }

        // Update status to approved
        membership.status = 'approved';
        membership.role = 'member';
        await membership.save();

        console.log('Member approved:', membership.toJSON());

        res.json({ 
            success: true, 
            message: 'Member approved successfully',
            membership
        });

    } catch (error) {
        console.error('Approve error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// PUT /api/memberships/reject/:groupId/:userId - Reject member (leader only)
router.put('/reject/:groupId/:userId', protect, async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId);
        const userId = parseInt(req.params.userId);
        const leaderId = req.user.id;

        console.log('Reject request:', { groupId, userId, leaderId });

        // Get the group to check leader
        const group = await StudyGroup.findByPk(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if requester is group leader
        if (group.leader_id !== leaderId && req.user.role !== 'admin') {
            return res.status(403).json({ 
                message: 'Only group leader can reject members',
                debug: { leaderId, groupLeaderId: group.leader_id }
            });
        }

        // Find the membership
        const membership = await Membership.findOne({
            where: { user_id: userId, group_id: groupId }
        });

        if (!membership) {
            return res.status(404).json({ message: 'Join request not found' });
        }

        // Update status to rejected
        membership.status = 'rejected';
        await membership.save();

        console.log('Member rejected:', membership.toJSON());

        res.json({ 
            success: true, 
            message: 'Member rejected successfully',
            membership
        });

    } catch (error) {
        console.error('Reject error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// GET /api/memberships/pending/:groupId - Get pending requests (leader only)
router.get('/pending/:groupId', protect, async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId);
        const leaderId = req.user.id;

        // Get the group to check leader
        const group = await StudyGroup.findByPk(groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if requester is group leader
        if (group.leader_id !== leaderId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only group leader can view pending requests' });
        }

        const pending = await Membership.findAll({
            where: { 
                group_id: groupId, 
                status: 'pending'
            },
            include: [{ 
                model: User, 
                attributes: ['id', 'name', 'email', 'program', 'year'] 
            }]
        });

        res.json({ success: true, pending });

    } catch (error) {
        console.error('Pending error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
// GET /api/memberships/my-groups - Get user's APPROVED groups
router.get('/my-groups', protect, async (req, res) => {
    try {
        const memberships = await Membership.findAll({
            where: { 
                user_id: req.user.id,
                status: 'approved'
            },
            include: [{
                model: StudyGroup,
                include: [{ model: User, as: 'leader', attributes: ['id', 'name'] }]
            }]
        });

        const groups = memberships.map(m => m.StudyGroup).filter(g => g);
        res.json({ success: true, groups, count: groups.length });
    } catch (error) {
        console.error('My groups error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/memberships/leave/:groupId - Leave a group
router.delete('/leave/:groupId', protect, async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const userId = req.user.id;

        const membership = await Membership.findOne({
            where: { user_id: userId, group_id: groupId }
        });

        if (!membership) {
            return res.status(404).json({ message: 'Not a member' });
        }

        if (membership.role === 'leader') {
            return res.status(400).json({ message: 'Leader cannot leave. Transfer leadership first.' });
        }

        await membership.destroy();
        res.json({ success: true, message: 'Left successfully' });
    } catch (error) {
        console.error('Leave error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;