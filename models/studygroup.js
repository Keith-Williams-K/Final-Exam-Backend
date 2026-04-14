const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StudyGroup = sequelize.define('StudyGroup', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    course: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    location: {
        type: DataTypes.STRING(255),
        defaultValue: 'Online'
    },
    leader_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'study_groups',
    timestamps: true,
    underscored: true
});

module.exports = StudyGroup;