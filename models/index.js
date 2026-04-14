const User = require('./User');
const StudyGroup = require('./StudyGroup');
const Membership = require('./Membership');
const Session = require('./Session');
const Post = require('./Post');

// Many-to-Many: Users <-> Groups through Membership
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

// Group leader
StudyGroup.belongsTo(User, { 
  as: 'leader', 
  foreignKey: 'leader_id' 
});

User.hasMany(StudyGroup, { 
  foreignKey: 'leader_id' 
});

// Membership belongs to both
Membership.belongsTo(User, { foreignKey: 'user_id' });
Membership.belongsTo(StudyGroup, { foreignKey: 'group_id' });

// Sessions
StudyGroup.hasMany(Session, { foreignKey: 'group_id' });
Session.belongsTo(StudyGroup, { foreignKey: 'group_id' });
Session.belongsTo(User, { as: 'creator', foreignKey: 'created_by' });

// Posts
StudyGroup.hasMany(Post, { foreignKey: 'group_id' });
Post.belongsTo(StudyGroup, { foreignKey: 'group_id' });
Post.belongsTo(User, { foreignKey: 'user_id' });

module.exports = { User, StudyGroup, Membership, Session, Post };