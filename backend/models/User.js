/**
 * 👤 User Model
 * ------------------------------------------------------------------------------
 * Represents the primary account owner. Stores authentication credentials,
 * profile metadata, and associations with family circles.
 * 
 * @module User
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema
 * Represents a primary account holder in the Famplus application.
 * Responsible for authentication and managing family member profiles.
 */
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true, // Used as the primary login identifier
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true // Stored as a hashed string in production
  },
  name: {
    type: String,
    default: null,
    trim: true
  },
  avatar: {
    type: String,
    default: ""
  },
  familyCircleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyCircle'
  }
}, { 
  timestamps: true // Track account creation and last update
});

// Hash password before saving
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    throw err;
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
