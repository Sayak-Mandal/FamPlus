const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/crypto');

const RecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  familyMemberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember',
    required: true
  },
  title: {
    type: String,
    required: true,
    get: decrypt,
    set: encrypt
  },
  category: {
    type: String,
    enum: ['Prescription', 'Lab Report', 'Vaccination', 'Other'],
    default: 'Other'
  },
  fileName: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    default: 'application/pdf'
  },
  fileSize: {
    type: Number
  },
  recordedAt: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

module.exports = mongoose.model('Record', RecordSchema);
