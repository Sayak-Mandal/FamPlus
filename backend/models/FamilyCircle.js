const mongoose = require('mongoose');

/**
 * FamilyCircle Schema
 * Represents a shared group of users and family member profiles.
 */
const FamilyCircleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    default: 'My Family Circle'
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  pendingInvites: [{
    type: String, // Emails of users invited to this circle
    lowercase: true,
    trim: true
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('FamilyCircle', FamilyCircleSchema);
