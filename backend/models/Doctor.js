const mongoose = require('mongoose');

/**
 * Doctor Schema
 * Represents a medical professional in the Famplus network.
 * Used for specialist recommendations based on AI symptom analysis.
 */
const DoctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  specialty: {
    type: String,
    required: true, // e.g., 'Cardiologist', 'Dermatologist'
    index: true // Indexed for fast lookup by specialty
  },
  lat: {
    type: Number,
    required: true
  },
  lng: {
    type: Number,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    default: null
  },
  availability: {
    type: String, // e.g., 'Mon-Fri, 9am-5pm'
    default: null
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: null
  },
  image: {
    type: String, // URL to profile picture
    default: null
  }
}, { 
  timestamps: true // Automatically manage createdAt and updatedAt fields
});

module.exports = mongoose.model('Doctor', DoctorSchema);
