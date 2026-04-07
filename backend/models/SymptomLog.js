const mongoose = require('mongoose');

/**
 * SymptomLog Schema
 * Stores historical records of user-reported symptoms and their corresponding 
 * AI-generated diagnostic advice.
 */
const SymptomLogSchema = new mongoose.Schema({
  symptoms: {
    type: String, // Raw Natural Language string or processed comma-separated list
    required: true
  },
  analysis: {
    type: String, // Full text result returned from the FastAPI ai_engine
    required: true
  },
  severity: {
    type: String, 
    enum: ['Safe', 'Consult Doctor', 'Emergency'], // Restrict to mapped severity levels
    required: true
  },
  familyMemberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember',
    required: true,
    index: true // Indexed for fast history retrieval per family member
  }
}, { 
  timestamps: true // Track when the symptom was logged
});

module.exports = mongoose.model('SymptomLog', SymptomLogSchema);
