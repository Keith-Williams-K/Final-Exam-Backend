const express = require('express');
const router = express.Router();
const { Post, User, StudyGroup, Membership } = require('../models');
const { protect } = require('../middleware/auth');

// @route   POST /api/posts/:groupId
// @desc    Create a post in a group
// @access  Private (members only)
router.post('/:groupId', protect, async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const { content } = req.body;

        if (!content || content.trim() === '') {
            return res.status(400).json({ 
                message: 'Post content cannot be empty' 
            });
        }

        const membership = await Membership.findOne({
            where: { user_id: req.user.id, group_id: groupId }
        });

        if (!membership && req.user.role !== 'admin') {
            return res.status(403).json({ 
                message: 'You must be a member to post' 
            });
        }

        const post = await Post.create({
            group_id: groupId,
            user_id: req.user.id,
            content: content.trim()
        });

        const postWithUser = await Post.findByPk(post.id, {
            include: [
                {
                    model: User,
                    attributes: ['id', 'name', 'program']
                }
            ]
        });

        res.status(201).json({
            success: true,
            message: 'Post created successfully',
            post: postWithUser
        });

    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({ 
            message: 'Server error' 
        });
    }
});

// @route   GET /api/posts/:groupId
// @desc    Get all posts for a group
// @access  Private (members only)
router.get('/:groupId', protect, async (req, res) => {
    try {
        const groupId = req.params.groupId;

        const membership = await Membership.findOne({
            where: { user_id: req.user.id, group_id: groupId }
        });

        if (!membership && req.user.role !== 'admin') {
            return res.status(403).json({ 
                message: 'You must be a member to view posts' 
            });
        }

        const posts = await Post.findAll({
            where: { group_id: groupId },
            include: [
                {
                    model: User,
                    attributes: ['id', 'name', 'program']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            count: posts.length,
            posts
        });

    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({ 
            message: 'Server error' 
        });
    }
});

// @route   DELETE /api/posts/:postId
// @desc    Delete a post
// @access  Private (author, leader, or admin)
router.delete('/:postId', protect, async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.postId, {
            include: [{ model: StudyGroup, attributes: ['leader_id'] }]
        });

        if (!post) {
            return res.status(404).json({ 
                message: 'Post not found' 
            });
        }

        const isAuthor = post.user_id === req.user.id;
        const isLeader = post.StudyGroup.leader_id === req.user.id;

        if (!isAuthor && !isLeader && req.user.role !== 'admin') {
            return res.status(403).json({ 
                message: 'Not authorized to delete this post' 
            });
        }

        await post.destroy();

        res.json({
            success: true,
            message: 'Post deleted successfully'
        });

    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({ 
            message: 'Server error' 
        });
    }
});

module.exports = router;