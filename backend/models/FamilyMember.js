/**
 * @file FamilyMember.js
 * @description Mongoose model for family members. Defines the schema and data structure 
 * for storing a user's family members, including health metrics and relations.
 */

const mongoose = require('mongoose');

/**
 * Family Member Schema definition.
 * Includes both basic personal info (name, relation, age) and real-time/historic
 * health metrics (heart rate, blood pressure, steps, sleep).
 */
const FamilyMemberSchema = new mongoose.Schema({
  // Basic personal information
  name: {
    type: String,
    required: true
  },
  relation: {
    type: String,
    required: true
  },
  age: {
    type: Number,
    required: true
  },
  
  // UI customization for frontend avatars
  avatar: {
    type: String,
    default: ""
  },
  avatarColor: {
    type: String,
    default: "bg-blue-100 text-blue-600"
  },
  
  // Health telemetry data
  // These fields are typically updated by external devices or API integration
  heartRate: {
    type: Number,
    default: 0
  },
  bloodPressure: {
    type: String,
    default: "120/80"
  },
  steps: {
    type: Number,
    default: 0
  },
  sleep: {
    type: String, // Stored as a string (e.g., "7h 30m") for easier frontend display
    default: "0h"
  },
  workouts: {
    type: Number,
    default: 0
  },
  water: {
    type: Number,
    default: 0
  },
  activeCalories: {
    type: Number,
    default: 0
  },
  
  // Relational reference connecting this family member to the main Account User
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  familyCircleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyCircle'
  }
}, { 
  // Automatically adds `createdAt` and `updatedAt` timestamps to the document
  timestamps: true 
});

// Export the model for use in controllers
module.exports = mongoose.model('FamilyMember', FamilyMemberSchema);
