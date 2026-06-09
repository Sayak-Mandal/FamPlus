/**
 * @file Record.js
 * @description Mongoose schema for medical vault records.
 *
 * As of v2.0, files are stored in MongoDB GridFS instead of the local disk.
 * The `gridfsId` field is the primary pointer to the actual file binary data.
 * `fileName` and `fileUrl` are kept for backward compatibility with any
 * records that were stored on disk before the GridFS migration.
 *
 * Security model:
 *  - `title` is encrypted at rest using AES-256 via the custom crypto util.
 *  - The `gridfsId` reference only resolves to file bytes through the
 *    authenticated `/uploads/:filename` route which enforces IDOR checks.
 */
const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/crypto');

const RecordSchema = new mongoose.Schema({
  /** Reference to the owning user account */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  /** Reference to the specific family member this record belongs to */
  familyMemberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FamilyMember',
    required: true
  },

  /**
   * Document title — stored AES-256 encrypted at rest.
   * Getters/setters handle transparent encrypt/decrypt.
   */
  title: {
    type: String,
    required: true,
    get: decrypt,
    set: encrypt
  },

  /** Medical category for filtering and display */
  category: {
    type: String,
    enum: ['Prescription', 'Lab Report', 'Vaccination', 'Other'],
    default: 'Other'
  },

  /**
   * GridFS file ID — points to the actual binary in the
   * `medical_records.files` / `medical_records.chunks` GridFS bucket.
   * Required for all new uploads (post-GridFS migration).
   */
  gridfsId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },

  /**
   * Original filename as uploaded by the user.
   * Stored so the browser can suggest a meaningful filename on download.
   * Optional for backward compatibility with legacy disk-stored records.
   */
  fileName: {
    type: String
  },

  /**
   * Legacy field — previously held the disk URL like `/uploads/<name>`.
   * Kept for backward compatibility. New records do not populate this.
   */
  fileUrl: {
    type: String
  },

  /** MIME type of the uploaded file (e.g. `application/pdf`, `image/jpeg`) */
  fileType: {
    type: String,
    default: 'application/pdf'
  },

  /** File size in bytes */
  fileSize: {
    type: Number
  },

  /** When the record was originally produced (e.g. lab test date) */
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
