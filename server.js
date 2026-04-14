const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const membershipRoutes = require('./routes/memberships');
const sessionRoutes = require('./routes/sessions');
const postRoutes = require('./routes/posts');
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/admin', adminRoutes);

// Home route
app.get('/', (req, res) => {
    res.json({
        message: 'Study Group Finder API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            groups: '/api/groups',
            memberships: '/api/memberships',
            sessions: '/api/sessions',
            posts: '/api/posts',
            admin: '/api/admin'
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

sequelize.authenticate()
    .then(() => {
        console.log('✅ MySQL Database connected successfully');
        return sequelize.sync({ alter: true });
    })
    .then(() => {
        console.log('✅ Database models synchronized');
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('❌ Unable to connect to database:', err);
    });