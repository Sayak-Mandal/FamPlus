const mongoose = require('mongoose');

/**
 * VitalLog Schema
 * Discrete time-stamped records of physiological measurements.
 * Used for trending wellness analysis and historical tracking.
 */
const VitalLogSchema = new mongoose.Schema({
  weight: {
    type: Number,
    required: true // Stored in kilograms (kg)
  },
  height: {
    type: Number,
    required: true // Stored in centimeters (cm)
  },
  heartRate: {
    type: Number,
    required: true // Pulse rate in Beats Per Minute (BPM)
  },
  hydration: {
    type: Number,
    required: true // Daily water intake stored in milliliters (ml)
  },
  familyMemberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember',
    required: true,
    index: true // Indexed for fast charting/history retrieval
  },
  recordedAt: {
    type: Date,
    default: Date.now, // Allows for retroactive logging of backdated vitals
    index: true
  }
}, { 
  timestamps: false // Manual 'recordedAt' is used instead of automatic timestamps
});

module.exports = mongoose.model('VitalLog', VitalLogSchema);
