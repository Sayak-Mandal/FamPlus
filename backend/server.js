/**
 * 🚀 Famplus Backend Orchestrator (v4.0)
 * ------------------------------------------------------------------------------
 * Main API Gateway and Data Orchestration Layer.
 * Handles Authentication, Family Circle Management, and proxies requests to 
 * the Python AI Intelligence layer.
 * 
 * @module server.js
 * @author Famplus Developer
 */

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Data Models
const User = require('./models/User');
const FamilyMember = require('./models/FamilyMember');
const Doctor = require('./models/Doctor');
const VitalLog = require('./models/VitalLog');
const SymptomLog = require('./models/SymptomLog');
const FamilyCircle = require('./models/FamilyCircle');
const Record = require('./models/Record');

const multer = require('multer');
const { Readable } = require('stream');
const slugify = require('slugify');

/**
 * GridFS bucket handle — initialised after mongoose connects.
 * Bucket name 'medical_records' creates two collections:
 *   medical_records.files   (metadata per upload)
 *   medical_records.chunks  (255 kB binary chunks)
 * We keep the reference at module scope so all routes can access it.
 */
let gridFSBucket;

// Initialize Express Application
const app = express();
// Middleware
app.use(helmet()); // Basic security headers
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Custom middleware to sanitize inputs against NoSQL injection (Express v5 compatible)
function sanitizeObject(obj) {
  if (obj && typeof obj === 'object') {
    for (const key in obj) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else {
        sanitizeObject(obj[key]);
      }
    }
  }
}
app.use((req, res, next) => {
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// MULTER — Memory Storage (files held in RAM buffer, then piped to GridFS)
// We no longer write anything to the local filesystem for medical records.
// ─────────────────────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Only PDFs and images are accepted to prevent arbitrary file execution
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDFs and images are allowed.'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB hard cap
});

/**
 * Helper — uploads a Buffer into the GridFS bucket and returns the new file _id.
 *
 * @param {Buffer} buffer        - Raw file bytes from multer memory storage
 * @param {string} filename      - Unique filename to store in GridFS metadata
 * @param {string} contentType   - MIME type (e.g. 'application/pdf')
 * @returns {Promise<ObjectId>}  - Resolves with the GridFS file ObjectId
 */
function uploadToGridFS(buffer, filename, contentType) {
  return new Promise((resolve, reject) => {
    // Convert the in-memory buffer to a readable stream so GridFS can consume it
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null); // Signal end-of-stream

    const uploadStream = gridFSBucket.openUploadStream(filename, {
      contentType,
      // Extra metadata stored alongside the file — useful for auditing
      metadata: { uploadedAt: new Date(), source: 'famplus-vault' }
    });

    readable.pipe(uploadStream);

    uploadStream.on('finish', () => resolve(uploadStream.id));
    uploadStream.on('error', reject);
  });
}

// Rate Limiting (100 requests per 15 minutes as requested)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Strict Rate Limiting for Authentication Routes (Increased for testing)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many login or registration attempts. Please try again after 15 minutes.' }
});
app.use('/api/auth/', authLimiter);

// MongoDB URI from environment
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/famplus';

let dbConnected = false;
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    dbConnected = true;

    // ── GridFS Bucket Initialization ─────────────────────────────────────────
    // Must happen AFTER the connection is established so the native db handle
    // is available.  All uploaded medical files will be stored here instead of
    // the local filesystem.
    gridFSBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'medical_records' // → collections: medical_records.files / .chunks
    });
    console.log('✅ GridFS bucket "medical_records" ready');

    seedDemoUser(); // Run seeding on successful connection
  })
  .catch(err => {
    console.warn('⚠️ MongoDB connection error (using mock fallback):', err.message);
    dbConnected = false;
  });

// ==============================================================================
// SECTION: SYSTEM INITIALIZATION & SEEDING
// ==============================================================================

/**
 * Bootstraps the application with a high-fidelity demo environment.
 * Generates historical vitals, symptoms, and family members for a 'Doe Family' 
 * scenario, enabling immediate visualization of 'Guardian Technology'.
 */
async function seedDemoUser() {
  try {
    const demoEmail = 'demo@famplus.com';
    let user = await User.findOne({ email: demoEmail });

    // Always ensure the demo user exists
    if (!user) {
      user = await User.create({
        email: demoEmail,
        name: 'John Doe',
        avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=transparent',
        password: '123456'
      });
      console.log('🌱 Demo User created');
    } else {
      // Update existing user with the new name and avatar
      user.name = 'John Doe';
      user.avatar = 'https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=transparent';
      await user.save();
    }

    // Check if circle exists
    let circle = await FamilyCircle.findOne({ ownerId: user._id });
    if (!circle) {
      circle = await FamilyCircle.create({
        name: 'The Doe Family',
        ownerId: user._id,
        members: [user._id]
      });
      user.familyCircleId = circle._id;
      await user.save();
      console.log('🌱 Demo Circle created');
    } else {
      // Update the name if it's an old placeholder family name
      if (circle.name === 'The Doe Family') {
        circle.name = 'The Doe Family';
        await circle.save();
      }
    }

    const demoProfiles = [
      { name: 'John', relation: 'Self', age: 22, heartRate: 72, bloodPressure: '120/80', steps: 8500, sleep: '7h', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=transparent' },
      { name: 'Vikram', relation: 'Father', age: 52, heartRate: 78, bloodPressure: '135/85', steps: 4200, sleep: '6h', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Caleb&backgroundColor=transparent' },
      { name: 'Anita', relation: 'Mother', age: 48, heartRate: 74, bloodPressure: '125/80', steps: 5100, sleep: '7.5h', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Anya&backgroundColor=transparent' }
    ];

    const existingMembers = await FamilyMember.countDocuments({ userId: user._id });
    if (existingMembers > 0) {
      console.log('🌱 Demo profiles already exist. Skipping seed to preserve existing vitals and history.');
      return;
    }

    // CRITICAL: Clean up ALL existing members for this user to avoid duplicates and ensure sync
    await FamilyMember.deleteMany({ userId: user._id });
    console.log('🧹 Cleaned up ALL existing family members for demo user');

    for (const profile of demoProfiles) {
      const member = await FamilyMember.create({
        ...profile,
        userId: user._id,
        familyCircleId: circle._id,
        avatarColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`
      });
      console.log(`🌱 Created member: ${profile.name}`);

      // Ensure 7 days of Vitals history exists
      const existingLogs = await VitalLog.countDocuments({ familyMemberId: member._id });
      if (existingLogs < 7) {
        // Clear and re-generate if incomplete
        await VitalLog.deleteMany({ familyMemberId: member._id });
        const logs = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          // Randomize time between 7 AM and 8 PM
          date.setHours(7 + Math.floor(Math.random() * 13));
          date.setMinutes(Math.floor(Math.random() * 60));

          logs.push({
            familyMemberId: member._id,
            heartRate: profile.heartRate + (Math.floor(Math.random() * 10) - 5),
            hydration: 2000 + (Math.floor(Math.random() * 1000) - 500),
            weight: 70 + (Math.floor(Math.random() * 10) - 5),
            height: profile.name === 'Vikram' ? 175 : 170,
            recordedAt: date
          });
        }
        await VitalLog.insertMany(logs);
      }

      // Add sample symptoms for the "John" profile if none exist
      if (profile.name === 'John') {
        const existingSymptoms = await SymptomLog.countDocuments({ familyMemberId: member._id });
        if (existingSymptoms === 0) {
          await SymptomLog.create([
            {
              familyMemberId: member._id,
              symptoms: 'Chest pain and shortness of breath',
              analysis: 'Potential Cardiac Issue detected. High correlation with medical patterns for angina or early-stage cardiovascular distress.',
              recommendation: 'General Physician First: Please consult a GP immediately for a diagnostic ECG.',
              severity: 'Emergency',
              recordedAt: new Date(Date.now() - 86400000 * 2) // 2 days ago
            },
            {
              familyMemberId: member._id,
              symptoms: 'Frequent headaches and blurred vision',
              analysis: 'Stress or Hypertension suspected based on symptom cluster.',
              recommendation: 'Rest and hydration. Check blood pressure twice daily.',
              severity: 'Consult Doctor',
              recordedAt: new Date(Date.now() - 86400000 * 5) // 5 days ago
            }
          ]);
        }
      }
    }
    console.log('🌱 Demo data-rich profiles synchronized successfully');
  } catch (err) {
    console.error('❌ Seeding error:', err);
  }
}

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

/**
 * Authentication Middleware
 * Validates the presence and validity of the Bearer Token (JWT).
 * Attaches the validated User ID to the request object.
 */
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // Support authenticated downloads via link/query param
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token. Please log in again.' });
  }

  if (dbConnected) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(403).json({ error: 'Forbidden: Valid user record required' });
      }

      // Migration: Ensure user has a Family Circle
      if (!user.familyCircleId) {
        const circle = await FamilyCircle.create({
          name: `${user.name || user.email}'s Family`,
          ownerId: user._id,
          members: [user._id]
        });
        user.familyCircleId = circle._id;
        await user.save();

        await FamilyMember.updateMany(
          { userId: user._id, familyCircleId: { $exists: false } },
          { familyCircleId: circle._id }
        );
      }

      req.userId = userId;
      req.user = user;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } else {
    res.status(503).json({ error: 'Database disconnected' });
  }
};

/**
 * Validation Middleware for Auth Input
 */
const validateAuthInput = (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password must be valid strings' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }
  next();
};

/**
 * Access Control Middleware for Family Members (IDOR Protection)
 * Verifies that the family member belongs to the logged-in user's family circle.
 */
const requireMemberAccess = async (req, res, next) => {
  try {
    const memberId = req.params.memberId;
    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ error: 'Invalid member ID format' });
    }

    if (!dbConnected) {
      return res.status(503).json({ error: 'Database disconnected' });
    }

    const member = await FamilyMember.findById(memberId);
    if (!member) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    if (!req.user.familyCircleId || member.familyCircleId.toString() !== req.user.familyCircleId.toString()) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this family member' });
    }

    req.member = member;
    next();
  } catch (err) {
    console.error('Member access authorization error:', err);
    res.status(500).json({ error: 'Server authorization check failed' });
  }
};

/**
 * Access Control Middleware for Vital Logs (IDOR Protection)
 * Verifies that the vital log belongs to a member within the user's family circle.
 */
const requireVitalLogAccess = async (req, res, next) => {
  try {
    const logId = req.params.logId;
    if (!mongoose.Types.ObjectId.isValid(logId)) {
      return res.status(400).json({ error: 'Invalid log ID format' });
    }

    if (!dbConnected) {
      return res.status(503).json({ error: 'Database disconnected' });
    }

    const log = await VitalLog.findById(logId);
    if (!log) {
      return res.status(404).json({ error: 'Vital log not found' });
    }

    const member = await FamilyMember.findById(log.familyMemberId);
    if (!member || !req.user.familyCircleId || member.familyCircleId.toString() !== req.user.familyCircleId.toString()) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this vital log' });
    }

    req.vitalLog = log;
    next();
  } catch (err) {
    console.error('Vital log access authorization error:', err);
    res.status(500).json({ error: 'Server authorization check failed' });
  }
};

// ─────────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────────

// Register User
app.post('/api/auth/register', validateAuthInput, async (req, res) => {
  try {
    const { email, name, password } = req.body;

    if (dbConnected) {
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ error: 'User already exists' });

      const user = await User.create({ email, name: name || email.split('@')[0], password });

      // Auto-create a primary family circle for new users
      const circle = await FamilyCircle.create({
        name: `${user.name}'s Family`,
        ownerId: user._id,
        members: [user._id]
      });
      user.familyCircleId = circle._id;
      await user.save();

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.status(201).json({ token, id: user._id, email: user.email, name: user.name, familyCircleId: user.familyCircleId });
    }

    res.status(503).json({ error: 'Database disconnected' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login User
app.post('/api/auth/login', validateAuthInput, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Try DB if connected
    if (dbConnected) {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.json({
        token,
        id: user._id,
        email: user.email,
        name: user.name,
        familyCircleId: user.familyCircleId
      });
    }

    // Fallback for development if test-user ID is known
    if (email === 'demo@famplus.com' && password === '123456') {
      return res.json({ id: 'demo-user-id', email, name: 'Demo User' });
    }

    res.status(503).json({ error: 'Database disconnected' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete account
app.delete('/api/auth/account', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;

    // Cascade delete: family members, their vitals & symptoms
    const members = await FamilyMember.find({ userId });
    const memberIds = members.map(m => m._id);
    await VitalLog.deleteMany({ familyMemberId: { $in: memberIds } });
    await SymptomLog.deleteMany({ familyMemberId: { $in: memberIds } });
    await FamilyMember.deleteMany({ userId });

    // Handle Circle association
    const user = req.user;
    if (user.familyCircleId) {
      const circle = await FamilyCircle.findById(user.familyCircleId);
      if (circle) {
        if (circle.ownerId.toString() === userId) {
          await FamilyCircle.findByIdAndDelete(user.familyCircleId);
        } else {
          await FamilyCircle.findByIdAndUpdate(user.familyCircleId, { $pull: { members: userId } });
        }
      }
    }

    await User.findByIdAndDelete(userId);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// FAMILY MEMBER ROUTES
// ─────────────────────────────────────────────

// Get all family members for a user
app.get('/api/family', requireAuth, async (req, res) => {
  try {
    if (dbConnected) {
      const user = req.user;
      if (!user?.familyCircleId) return res.status(404).json({ error: 'Circle not found' });

      const members = await FamilyMember.find({ familyCircleId: user.familyCircleId }).sort({ createdAt: -1 });

      const enhancedMembers = await Promise.all(members.map(async (member) => {
        const latestLog = await VitalLog.findOne({ familyMemberId: member._id }).sort({ recordedAt: -1 });
        return {
          ...member.toObject(),
          weight: latestLog ? latestLog.weight : 0,
          height: latestLog ? latestLog.height : 0,
          latestVitalAt: latestLog ? latestLog.recordedAt : null, // True vitals timestamp
        };
      }));

      return res.json(enhancedMembers);
    }

    // Fallback Mock Family for development
    console.log('🔄 DB Disconnected: Using development family fallback');
    res.json([
      { _id: 'mock-member-1', name: 'John (Mock)', relation: 'Dad', age: 45, avatarColor: '#3b82f6', weight: 80, height: 180, heartRate: 72, bloodPressure: '120/80' },
      { _id: 'mock-member-2', name: 'Jane (Mock)', relation: 'Mom', age: 42, avatarColor: '#ec4899', weight: 65, height: 165, heartRate: 68, bloodPressure: '115/75' }
    ]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a new family member
app.post('/api/family', requireAuth, async (req, res) => {
  try {
    if (dbConnected) {
      const user = req.user;
      if (!user?.familyCircleId) return res.status(404).json({ error: 'Circle not found' });

      const { name, relation, age, avatar, avatarColor } = req.body;
      if (!name || !relation || age === undefined) {
        return res.status(400).json({ error: 'Name, relation, and age are required' });
      }
      if (typeof name !== 'string' || typeof relation !== 'string' || typeof age !== 'number') {
        return res.status(400).json({ error: 'Invalid input data types' });
      }

      const member = await FamilyMember.create({
        name,
        relation,
        age,
        avatar: typeof avatar === 'string' ? avatar : '',
        avatarColor: typeof avatarColor === 'string' ? avatarColor : `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        userId: user._id,
        familyCircleId: user.familyCircleId
      });

      // SYNC: If this is the user themselves (Self), update the User document too
      if (member.relation === 'Self') {
        await User.findByIdAndUpdate(user._id, {
          name: member.name,
          avatar: member.avatar
        });
        console.log(`🔄 Synced User profile for ${member.name} on creation`);
      }

      res.status(201).json(member);
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update family member details
app.put('/api/family/:memberId', requireAuth, requireMemberAccess, async (req, res) => {
  try {
    const oldMember = req.member;
    const updateData = {};
    const whitelist = [
      'name', 'relation', 'age', 'avatar', 'avatarColor',
      'heartRate', 'bloodPressure', 'steps', 'sleep',
      'workouts', 'water', 'activeCalories'
    ];

    whitelist.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Perform the update
    const member = await FamilyMember.findByIdAndUpdate(
      req.params.memberId,
      { $set: updateData },
      { new: true }
    );

    // Track if the user explicitly logged/updated their vitals
    const vitalsChanged = (
      updateData.heartRate !== undefined && updateData.heartRate !== oldMember.heartRate ||
      updateData.bloodPressure !== undefined && updateData.bloodPressure !== oldMember.bloodPressure ||
      updateData.steps !== undefined && updateData.steps !== oldMember.steps ||
      updateData.sleep !== undefined && updateData.sleep !== oldMember.sleep ||
      updateData.water !== undefined && updateData.water !== oldMember.water ||
      updateData.activeCalories !== undefined && updateData.activeCalories !== oldMember.activeCalories
    );

    if (vitalsChanged) {
      const lastLog = await VitalLog.findOne({ familyMemberId: member._id }).sort({ recordedAt: -1 });

      // Use explicitly-provided weight/height from the request body, falling back to last log or defaults
      const newWeight = (req.body.weight !== undefined && req.body.weight > 0)
        ? req.body.weight
        : (lastLog ? lastLog.weight : 70);
      const newHeight = (req.body.height !== undefined && req.body.height > 0)
        ? req.body.height
        : (lastLog ? lastLog.height : 170);
      
      await VitalLog.create({
        familyMemberId: member._id,
        weight: newWeight,
        height: newHeight,
        heartRate: member.heartRate || (lastLog ? lastLog.heartRate : 70),
        hydration: member.water ? member.water * 1000 : (lastLog ? lastLog.hydration : 2000),
        recordedAt: new Date()
      });
      console.log(`📈 New VitalLog created for ${member.name} (weight: ${newWeight}kg, height: ${newHeight}cm).`);
    }

    // SYNC: If this is the user themselves (Self), update the User document too
    if (member.relation === 'Self' && member.userId.toString() === req.userId) {
      await User.findByIdAndUpdate(req.userId, {
        name: member.name,
        avatar: member.avatar
      });
      console.log(`🔄 Synced User profile for ${member.name}`);
    }

    res.json(member);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete family member
app.delete('/api/family/:memberId', requireAuth, requireMemberAccess, async (req, res) => {
  try {
    await FamilyMember.findByIdAndDelete(req.params.memberId);
    await VitalLog.deleteMany({ familyMemberId: req.params.memberId });
    await SymptomLog.deleteMany({ familyMemberId: req.params.memberId });
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// VITAL LOG ROUTES
// ─────────────────────────────────────────────

// Get vitals for a family member
app.get('/api/family/:memberId/vitals', requireAuth, requireMemberAccess, async (req, res) => {
  try {
    const logs = await VitalLog.find({ familyMemberId: req.params.memberId }).sort({ recordedAt: -1 }).limit(50);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new vitals log
app.post('/api/family/:memberId/vitals', requireAuth, requireMemberAccess, async (req, res) => {
  try {
    const { weight, height, heartRate, hydration, recordedAt } = req.body;
    if (weight === undefined || height === undefined || heartRate === undefined || hydration === undefined) {
      return res.status(400).json({ error: 'Weight, height, heartRate, and hydration are required' });
    }

    const log = await VitalLog.create({
      weight: Number(weight),
      height: Number(height),
      heartRate: Number(heartRate),
      hydration: Number(hydration),
      familyMemberId: req.params.memberId,
      recordedAt: recordedAt || new Date()
    });

    // Update the snapshot on the family member as well for quick dashboard access
    await FamilyMember.findByIdAndUpdate(req.params.memberId, {
      heartRate: Number(heartRate)
    });

    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a vital log
app.put('/api/vitals/:logId', requireAuth, requireVitalLogAccess, async (req, res) => {
  try {
    const { weight, height, heartRate, hydration, recordedAt } = req.body;
    const updateData = {};
    if (weight !== undefined) updateData.weight = Number(weight);
    if (height !== undefined) updateData.height = Number(height);
    if (heartRate !== undefined) updateData.heartRate = Number(heartRate);
    if (hydration !== undefined) updateData.hydration = Number(hydration);
    if (recordedAt !== undefined) updateData.recordedAt = recordedAt;

    // Track that the vital log has been edited
    updateData.isEdited = true;

    const log = await VitalLog.findByIdAndUpdate(req.params.logId, updateData, { new: true });
    res.json(log);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a vital log
app.delete('/api/vitals/:logId', requireAuth, requireVitalLogAccess, async (req, res) => {
  try {
    await VitalLog.findByIdAndDelete(req.params.logId);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==============================================================================
// SECTION: AI ENGINE INTEGRATION (INFERENCE PROXIES)
// ==============================================================================

/**
 * Symptom Analysis Orchestrator.
 * 1. Accepts user symptoms.
 * 2. Proxies request to the Python Inference Engine (FastAPI).
 * 3. Maps predicted results to severity levels and persists to MongoDB history.
 */
app.post('/api/family/:memberId/analyze-symptoms', requireAuth, requireMemberAccess, async (req, res) => {
  try {
    const { symptoms } = req.body;
    if (!symptoms) return res.status(400).json({ error: 'Symptoms are required' });
    if (typeof symptoms !== 'string') return res.status(400).json({ error: 'Symptoms must be a valid string' });
    
    // Retrieve family member details and construct vitals context (set by requireMemberAccess)
    const member = req.member;
    let vitals_context = undefined;
    if (member) {
      const ageMinutes = member.latestVitalAt ? Math.floor((Date.now() - new Date(member.latestVitalAt).getTime()) / 60000) : undefined;
      vitals_context = {
        heart_rate: member.heartRate || undefined,
        blood_pressure: member.bloodPressure || undefined,
        sleep: member.sleep || undefined,
        age: member.age || undefined,
        data_age_minutes: ageMinutes
      };
    }

    // Orchestration: Call Python AI engine for inference with vitals context
    const aiRes = await axios.post(`${AI_ENGINE_URL}/predict_symptoms`, { 
      symptoms,
      vitals_context
    });
    const {
      condition,
      confidence,
      advice,
      specialist,
      description,
      precautions,
      urgency,
      top_matches,
      next_steps,
      vitals_analysis,
      disclaimer
    } = aiRes.data;

    // Severity mapping for UI highlighting
    let severity = 'Safe';
    if (condition === 'Emergency' || urgency === 'Emergency') severity = 'Emergency';
    else if (confidence >= 70 || urgency === 'High') severity = 'Consult Doctor';

    const log = await SymptomLog.create({
      familyMemberId: req.params.memberId,
      symptoms,
      analysis: `${condition} (${confidence}% confidence) — ${advice} Recommended: ${specialist}.`,
      severity,
    });

    res.json({
      ...log.toObject(),
      condition,
      confidence,
      advice,
      specialist,
      description,
      precautions,
      urgency,
      top_matches,
      next_steps,
      vitals_analysis,
      disclaimer
    });
  } catch (err) {
    console.error('Symptom analysis error:', err.message);
    res.status(500).json({ error: 'Failed to analyze symptoms. Is the AI engine running?' });
  }
});

/**
 * DOCTOR & CLINIC DISCOVERY
 */

// Fetches the full list of registered healthcare providers
app.get('/api/doctors', requireAuth, async (req, res) => {
  try {
    const doctors = await Doctor.find();
    res.json(doctors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Analyzes symptoms using the AI engine and finds matching doctors by specialty.
 * 
 * @route POST /api/doctors/analyze
 * @param {string} symptoms - Natural language symptom description.
 * @returns {AnalysisResponse} { analysis, specialty, doctors[] }
 */
app.post('/api/doctors/analyze', requireAuth, async (req, res) => {
  try {
    const { symptoms, providedSpecialist, providedAnalysis } = req.body;
    if (!symptoms && !providedSpecialist) return res.status(400).json({ error: 'Symptoms or specialist required' });

    let specialist = providedSpecialist || '';
    let analysis = providedAnalysis || '';

    if (!specialist) {
      // AI Prediction -> Specialty Matching
      const aiRes = await axios.post(`${AI_ENGINE_URL}/predict_symptoms`, { symptoms });
      specialist = aiRes.data.specialist;
      // analysis is now built from scoped variables (not condition/advice which were never declared)
      analysis = `${aiRes.data.condition} — ${aiRes.data.advice}`;
    }

    let doctors = await Doctor.find({
      specialty: { $regex: specialist, $options: 'i' }
    }).limit(5);

    // Fallback: if no specific specialist found, return General Physicians
    if (doctors.length === 0) {
      console.log(`No doctors found for "${specialist}" in DB. Note: most doctors are in the frontend static list.`);
      doctors = await Doctor.find({
        specialty: { $regex: 'General Physician', $options: 'i' }
      }).limit(5);
    }

    // ── Easter Egg: Ghost of Park Street ─────────────────────────────────────
    if (specialist === 'Professional Exorcist') {
      doctors = [{
        id: 'ghost-1',
        name: 'The Ghost of Park Street',
        specialty: 'Professional Exorcist',
        hospital: 'South Park Street Cemetery',
        address: '52, Park St, Mullick Bazar, Park Street area, Kolkata, West Bengal 700017',
        rating: 4.9,
        lat: 22.5448,
        lng: 88.3591,
        phone: 'BOO-GHOST-BUSTERS'
      }];
    }

    // Fixed: use the `analysis` variable (declared in outer scope) instead of
    // the undefined `condition` and `advice` variables that caused a ReferenceError.
    res.json({ analysis, specialty: specialist, doctors });
  } catch (err) {
    console.error('Doctor analysis error:', err.message);
    const allDoctors = await Doctor.find().limit(5);
    res.json({ analysis: 'Unable to analyze symptoms.', specialty: 'General Physician', doctors: allDoctors });
  }
});

// ─────────────────────────────────────────────
// WELLNESS SCORE ROUTE (proxied to FastAPI)
// ─────────────────────────────────────────────

/**
 * Computes a wellness score based on historical vital logs.
 * Proxies the request to the Python AI Engine.
 * 
 * @route POST /api/family/:memberId/wellness
 */
app.post('/api/family/:memberId/wellness', requireAuth, requireMemberAccess, async (req, res) => {
  try {
    const logs = await VitalLog.find({ familyMemberId: req.params.memberId }).sort({ recordedAt: 1 });

    if (logs.length === 0) {
      return res.json({ score: 0, status: 'No Data', recommendation: 'Please log some vitals first.', anomalies: [] });
    }

    const member = req.member;

    const vitals_history = logs.map(l => ({
      bloodPressure: member?.bloodPressure || '120/80',
      heartRate: l.heartRate,
      steps: member?.steps || 5000,
      sleep: member?.sleep || '7h',
    }));

    const aiRes = await axios.post(`${AI_ENGINE_URL}/predict_wellness`, { vitals_history });
    res.json(aiRes.data);
  } catch (err) {
    console.error('Wellness error:', err.message);
    res.status(500).json({ error: 'Failed to compute wellness score.' });
  }
});

// ─────────────────────────────────────────────
// HISTORICAL RECORD VAULT ROUTES
// ─────────────────────────────────────────────

/**
 * Upload a new medical record to MongoDB GridFS.
 *
 * @route   POST /api/records/upload
 * @access  Private (JWT required)
 *
 * Security measures:
 *  1. JWT authentication via requireAuth middleware
 *  2. IDOR check — confirms the target familyMember belongs to the requester's circle
 *  3. MIME-type whitelist enforced by multer fileFilter (PDFs + images only)
 *  4. 10 MB file-size cap
 *  5. File bytes never touch the local disk — held in RAM buffer then streamed to MongoDB
 */
app.post('/api/records/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!gridFSBucket) return res.status(503).json({ error: 'Storage not ready, please retry' });

    const { title, category, familyMemberId } = req.body;
    if (!title || !familyMemberId) {
      return res.status(400).json({ error: 'Title and Family Member are required' });
    }

    // ── IDOR Guard ────────────────────────────────────────────────────────────
    // Prevent users from attaching records to family members they don't own.
    const member = await FamilyMember.findById(familyMemberId);
    if (
      !member ||
      !req.user.familyCircleId ||
      member.familyCircleId.toString() !== req.user.familyCircleId.toString()
    ) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this family member' });
    }

    // ── GridFS Upload ─────────────────────────────────────────────────────────
    // Build a unique, slug-safe filename for the GridFS metadata entry.
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const baseName = slugify(req.file.originalname.split('.')[0], { lower: true, strict: true });
    const extension = path.extname(req.file.originalname);
    const storedFilename = `${baseName}-${uniqueSuffix}${extension}`;

    // Stream the in-memory buffer into GridFS — file is chunked at 255 kB internally
    const gridfsFileId = await uploadToGridFS(
      req.file.buffer,
      storedFilename,
      req.file.mimetype
    );

    // ── MongoDB Record ────────────────────────────────────────────────────────
    // Save the metadata record. The actual binary lives in GridFS; we only
    // store the reference ID and enough metadata to serve it later.
    const record = await Record.create({
      userId: req.userId,
      familyMemberId,
      title,
      category: category || 'Other',
      gridfsId: gridfsFileId,           // ← key reference to GridFS file
      fileName: storedFilename,          // stored for Content-Disposition header
      fileType: req.file.mimetype,
      fileSize: req.file.size
      // fileUrl intentionally omitted — files are served via /uploads/:filename
    });

    res.status(201).json(record);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload record' });
  }
});

/**
 * Stream a medical record file from GridFS to the authenticated requester.
 *
 * @route   GET /uploads/:filename
 * @access  Private (JWT required)
 *
 * Security:
 *  - JWT auth via requireAuth
 *  - IDOR check: only the record owner OR a family-circle member can download
 *  - File bytes never land on disk — piped directly from MongoDB to HTTP response
 */
app.get('/uploads/:filename', requireAuth, async (req, res) => {
  try {
    if (!gridFSBucket) return res.status(503).json({ error: 'Storage not ready' });

    const { filename } = req.params;

    // Locate the metadata record using the stored filename
    const record = await Record.findOne({ fileName: filename });
    if (!record) {
      return res.status(404).json({ error: 'Medical record not found' });
    }

    // ── IDOR Guard ────────────────────────────────────────────────────────────
    const user = req.user;
    const isOwner = record.userId.toString() === req.userId;
    let isCircleMember = false;

    if (!isOwner) {
      const recordMember = await FamilyMember.findById(record.familyMemberId);
      isCircleMember =
        recordMember &&
        recordMember.familyCircleId &&
        user.familyCircleId &&
        recordMember.familyCircleId.toString() === user.familyCircleId.toString();
    }

    if (!isOwner && !isCircleMember) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this medical record' });
    }

    // ── GridFS Stream ─────────────────────────────────────────────────────────
    // Set headers so browsers know how to handle the response
    res.set('Content-Type', record.fileType || 'application/octet-stream');
    res.set('Content-Disposition', `inline; filename="${record.fileName}"`);

    // Open a GridFS download stream by the stored ObjectId and pipe to response
    const downloadStream = gridFSBucket.openDownloadStream(record.gridfsId);

    downloadStream.on('error', (err) => {
      console.error('GridFS download error:', err);
      // Only send error header if headers haven't been flushed yet
      if (!res.headersSent) {
        res.status(404).json({ error: 'File not found in storage' });
      }
    });

    downloadStream.pipe(res);
  } catch (err) {
    console.error('File serving error:', err);
    res.status(500).json({ error: 'Failed to serve medical record' });
  }
});

/**
 * Get all records for the user's family circle
 */
app.get('/api/records', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    if (!user.familyCircleId) return res.status(404).json({ error: 'Circle not found' });

    // Get all members in the circle
    const members = await FamilyMember.find({ familyCircleId: user.familyCircleId });
    const memberIds = members.map(m => m._id);

    // Find records for these members
    const records = await Record.find({ familyMemberId: { $in: memberIds } })
      .sort({ createdAt: -1 })
      .populate('familyMemberId', 'name avatar relation');

    res.json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Delete a medical record and its associated file from GridFS.
 *
 * @route   DELETE /api/records/:recordId
 * @access  Private (JWT required, record owner only)
 *
 * Security:
 *  - The query `{ _id, userId }` ensures only the record owner can delete.
 *  - Both the GridFS binary AND the metadata document are removed atomically
 *    (within the same try/catch to avoid orphaned chunks).
 */
app.delete('/api/records/:recordId', requireAuth, async (req, res) => {
  try {
    // Owner-only delete — adding userId to the query prevents IDOR deletion
    const record = await Record.findOne({ _id: req.params.recordId, userId: req.userId });
    if (!record) return res.status(404).json({ error: 'Record not found or unauthorized' });

    // ── GridFS Deletion ───────────────────────────────────────────────────────
    // Delete the binary chunks from GridFS before removing the metadata record.
    // If gridfsId is missing (legacy disk record), skip gracefully.
    if (record.gridfsId && gridFSBucket) {
      try {
        await gridFSBucket.delete(record.gridfsId);
      } catch (gridErr) {
        // Log but don't block — the metadata record should still be removed
        console.warn('GridFS delete warning (file may already be missing):', gridErr.message);
      }
    }

    // Remove the MongoDB metadata document
    await Record.findByIdAndDelete(req.params.recordId);
    res.json({ success: true, message: 'Record and file deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// FAMILY CIRCLE MANAGEMENT ROUTES
// ─────────────────────────────────────────────

// Get details about my current circle
app.get('/api/circle/details', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('familyCircleId');
    if (!user?.familyCircleId) return res.status(404).json({ error: 'Circle not found' });

    const circle = await FamilyCircle.findById(user.familyCircleId).populate('members', 'email name avatar');

    // Also fetch the FamilyMember documents belonging to this circle
    const familyMembers = await FamilyMember.find({ familyCircleId: user.familyCircleId })
      .select('name relation age avatar avatarColor userId')
      .lean();

    res.json({ ...circle.toObject(), familyMembers });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Invite a user to a family circle
app.post('/api/circle/invite', requireAuth, async (req, res) => {
  try {
    const { email } = req.body;
    const invitee = await User.findOne({ email });
    if (!invitee) return res.status(404).json({ error: 'User not found' });

    // Check if user is already in a circle or has a pending invite?
    // Keep it simple: send the invite
    await FamilyCircle.findByIdAndUpdate(req.user.familyCircleId, {
      $addToSet: { pendingInvites: email.toLowerCase() }
    });

    res.json({ success: true, message: `Invite sent to ${email}` });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Check if I have any pending invitations
app.get('/api/circle/invites', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const circles = await FamilyCircle.find({ pendingInvites: user.email.toLowerCase() });

    res.json(circles.map(c => ({
      id: c._id,
      name: c.name,
      inviter: c.ownerId // Could populate later
    })));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Accept an invitation
app.post('/api/circle/accept', requireAuth, async (req, res) => {
  try {
    const { circleId } = req.body;
    const user = req.user;

    // 1. Remove from old circle if owner? (Optional: simplified)
    if (user.familyCircleId) {
      await FamilyCircle.findByIdAndUpdate(user.familyCircleId, { $pull: { members: req.userId } });
    }

    // 2. Add to new circle
    const newCircle = await FamilyCircle.findById(circleId);
    if (!newCircle || !newCircle.pendingInvites.includes(user.email.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid or expired invitation' });
    }
    // 2. Join new circle
    user.familyCircleId = circleId;
    newCircle.members.push(req.userId);
    newCircle.pendingInvites = newCircle.pendingInvites.filter(e => e !== user.email.toLowerCase());

    await user.save();
    await newCircle.save();

    // 3. MERGE DATA (Safety Net): Move my family members to the new circle
    const result = await FamilyMember.updateMany(
      { userId: req.userId },
      { familyCircleId: circleId }
    );

    res.json({ success: true, migratedCount: result.modifiedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Express server running on http://localhost:${PORT}`);
});

// DDoS mitigation: Set connection & header timeouts
server.headersTimeout = 10 * 1000; // 10 seconds
server.requestTimeout = 15 * 1000; // 15 seconds
server.keepAliveTimeout = 5 * 1000; // 5 seconds
