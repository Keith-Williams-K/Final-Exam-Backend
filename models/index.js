// Model associations and relationships for the Study Group Finder database
const User = require('./User');
const StudyGroup = require('./StudyGroup');
const Membership = require('./Membership');
const Session = require('./Session');
const Post = require('./Post');

// Many-to-Many relationship: Users can belong to many Groups through Membership
User.belongsToMany(StudyGroup, {
  through: Membership,
  foreignKey: 'user_id',
  otherKey: 'group_id'
});

StudyGroup.belongsToMany(User, {
  through: Membership,
  foreignKey: 'group_id',
  otherKey: 'user_id'
});

// One-to-Many: StudyGroup has a leader (User)
StudyGroup.belongsTo(User, {
  as: 'leader',
  foreignKey: 'leader_id'
});

User.hasMany(StudyGroup, {
  foreignKey: 'leader_id'
});

// Membership belongs to both User and StudyGroup
Membership.belongsTo(User, { foreignKey: 'user_id' });
Membership.belongsTo(StudyGroup, { foreignKey: 'group_id' });

// One-to-Many: StudyGroup has many Sessions
StudyGroup.hasMany(Session, { foreignKey: 'group_id' });
Session.belongsTo(StudyGroup, { foreignKey: 'group_id' });
// Session has a creator (User)
Session.belongsTo(User, { as: 'creator', foreignKey: 'created_by' });
User.hasMany(Session, { foreignKey: 'created_by' });

// One-to-Many: StudyGroup has many Posts
StudyGroup.hasMany(Post, { foreignKey: 'group_id' });
Post.belongsTo(StudyGroup, { foreignKey: 'group_id' });
Post.belongsTo(User, { foreignKey: 'user_id' });

// Export all models for use in routes and other files
module.exports = { User, StudyGroup, Membership, Session, Post };