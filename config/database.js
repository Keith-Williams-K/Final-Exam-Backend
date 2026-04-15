// Database configuration using Sequelize ORM for MySQL connection
const { Sequelize } = require('sequelize');
// Load environment variables from .env file
require('dotenv').config();

// Create Sequelize instance with database credentials from environment variables
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: false, // Disable SQL query logging in console
        pool: {
            max: 5, // Maximum number of connections in pool
            min: 0, // Minimum number of connections in pool
            acquire: 30000, // Maximum time (ms) to get connection before throwing error
            idle: 10000 // Maximum time (ms) connection can be idle before being released
        }
    }
);

// Export the sequelize instance for use in models and server
module.exports = sequelize;