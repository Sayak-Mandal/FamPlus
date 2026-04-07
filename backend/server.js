/**
 * Famplus Express Backend
 * -----------------------
 * Main API entry point for the Famplus application. Responsible for:
 * 1. User Authentication (JWT-less, Header-based simplified auth)
 * 2. Family Member & Vitals Profile Management
 * 3. Orchestrating calls to the Python AI engine for medical analysis.
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

// Initialize Express Application
const app = express();
// Middleware
app.use(helmet()); // Basic security headers
app.use(cors());
app.use(express.json());

// Rate Limiting (100 requests per 15 minutes as requested)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

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
    seedDemoUser(); // Run seeding on successful connection
  })
  .catch(err => {
    console.warn('⚠️ MongoDB connection error (using mock fallback):', err.message);
    dbConnected = false;
  });

/**
 * Bootstraps a demo account with rich historical data for presentations/hackathons.
 * Creates a circle, multiple family members, and 7 days of vitals/symptoms.
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
        password: '123456'
      });
      console.log('🌱 Demo User created');
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
    }

    // Check if members exist, if not, seed them with history
    const existingMembers = await FamilyMember.find({ familyCircleId: circle._id });
    if (existingMembers.length === 0) {
      const demoProfiles = [
        { name: 'John', relation: 'Self', age: 22, heartRate: 72, bloodPressure: '120/80', steps: 8500, sleep: '7h' },
        { name: 'Vikram', relation: 'Father', age: 52, heartRate: 78, bloodPressure: '135/85', steps: 4200, sleep: '6h' },
        { name: 'Anita', relation: 'Mother', age: 48, heartRate: 74, bloodPressure: '125/80', steps: 5100, sleep: '7.5h' }
      ];

      for (const profile of demoProfiles) {
        const member = await FamilyMember.create({
          ...profile,
          userId: user._id,
          familyCircleId: circle._id,
          avatarColor: `#${Math.floor(Math.random()*16777215).toString(16)}`
        });

        // 1. Generate 7 days of Vitals history
        const logs = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          
          logs.push({
            familyMemberId: member._id,
            heartRate: profile.heartRate + (Math.floor(Math.random() * 10) - 5),
            bloodPressure: `${115 + Math.floor(Math.random() * 15)}/${75 + Math.floor(Math.random() * 10)}`,
            steps: profile.steps + (Math.floor(Math.random() * 2000) - 1000),
            weight: 70 + (Math.floor(Math.random() * 10) - 5),
            height: profile.name === 'Vikram' ? 175 : 170,
            recordedAt: date
          });
        }
        await VitalLog.insertMany(logs);

        // 2. Add some sample symptoms for the "John" profile
        if (profile.name === 'John') {
            await SymptomLog.create([
                {
                    familyMemberId: member._id,
                    symptoms: 'Chest pain and shortness of breath',
                    analysis: 'Potential Cardiac Issue detected. High correlation with medical patterns for angina or early-stage cardiovascular distress.',
                    recommendation: 'General Physician First: Please consult a GP immediately for a diagnostic ECG.',
                    severity: 'High',
                    recordedAt: new Date(Date.now() - 86400000 * 2) // 2 days ago
                },
                {
                    familyMemberId: member._id,
                    symptoms: 'Frequent headaches and blurred vision',
                    analysis: 'Stress or Hypertension suspected based on symptom cluster.',
                    recommendation: 'Rest and hydration. Check blood pressure twice daily.',
                    severity: 'Medium',
                    recordedAt: new Date(Date.now() - 86400000 * 5) // 5 days ago
                }
            ]);
        }
      }
      console.log('🌱 Demo data-rich profiles seeded successfully');
    }
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
  const token = authHeader && authHeader.split(' ')[1];
  
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

// ─────────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────────

// Register User
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, name, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

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
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

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

      const member = await FamilyMember.create({
        ...req.body,
        userId: user._id,
        familyCircleId: user.familyCircleId,
        avatarColor: req.body.avatarColor || `#${Math.floor(Math.random()*16777215).toString(16)}`
      });
      res.status(201).json(member);
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update family member details
app.put('/api/family/:memberId', requireAuth, async (req, res) => {
  try {
    const member = await FamilyMember.findOneAndUpdate(
      { _id: req.params.memberId, familyCircleId: req.user.familyCircleId },
      { $set: req.body },
      { new: true }
    );
    if (!member) return res.status(404).json({ error: 'Member not found or unauthorized' });
    res.json(member);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete family member
app.delete('/api/family/:memberId', requireAuth, async (req, res) => {
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
app.get('/api/family/:memberId/vitals', requireAuth, async (req, res) => {
  try {
    const logs = await VitalLog.find({ familyMemberId: req.params.memberId }).sort({ recordedAt: -1 }).limit(50);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new vitals log
app.post('/api/family/:memberId/vitals', requireAuth, async (req, res) => {
  try {
    const log = await VitalLog.create({
      ...req.body,
      familyMemberId: req.params.memberId,
      recordedAt: req.body.recordedAt || new Date()
    });

    // Update the snapshot on the family member as well for quick dashboard access
    await FamilyMember.findByIdAndUpdate(req.params.memberId, {
      heartRate: req.body.heartRate,
      bloodPressure: req.body.bloodPressure
    });

    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a vital log
app.put('/api/vitals/:logId', requireAuth, async (req, res) => {
  try {
    const log = await VitalLog.findByIdAndUpdate(req.params.logId, req.body, { new: true });
    if (!log) return res.status(404).json({ error: 'Vital log not found' });
    res.json(log);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a vital log
app.delete('/api/vitals/:logId', requireAuth, async (req, res) => {
  try {
    await VitalLog.findByIdAndDelete(req.params.logId);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * SYMPTOM ANALYSIS LOGIC
 * Intersects with the Python AI Engine to provide medical guidance.
 */

// Analyze symptoms and persist results to historical log
app.post('/api/family/:memberId/analyze-symptoms', requireAuth, async (req, res) => {
  try {
    const { symptoms } = req.body;
    if (!symptoms) return res.status(400).json({ error: 'Symptoms are required' });

    // Orchestration: Call Python AI engine for inference
    const aiRes = await axios.post(`${AI_ENGINE_URL}/predict_symptoms`, { symptoms });
    const { condition, confidence, advice, specialist } = aiRes.data;

    // Severity mapping for UI highlighting
    let severity = 'Safe';
    if (condition === 'Emergency') severity = 'Emergency';
    else if (confidence >= 70) severity = 'Consult Doctor';

    const log = await SymptomLog.create({
      familyMemberId: req.params.memberId,
      symptoms,
      analysis: `${condition} (${confidence}% confidence) — ${advice} Recommended: ${specialist}.`,
      severity,
    });

    res.json({ ...log.toObject(), condition, confidence, advice, specialist });
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
    const { symptoms } = req.body;
    if (!symptoms) return res.status(400).json({ error: 'Symptoms required' });

    // AI Prediction -> Specialty Matching
    const aiRes = await axios.post(`${AI_ENGINE_URL}/predict_symptoms`, { symptoms });
    const { condition, advice, specialist } = aiRes.data;

    let doctors = await Doctor.find({
      specialty: { $regex: specialist, $options: 'i' }
    }).limit(5);

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

    res.json({ analysis: `${condition} — ${advice}`, specialty: specialist, doctors });
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
app.post('/api/family/:memberId/wellness', requireAuth, async (req, res) => {
  try {
    const logs = await VitalLog.find({ familyMemberId: req.params.memberId }).sort({ recordedAt: 1 });

    if (logs.length === 0) {
      return res.json({ score: 0, status: 'No Data', recommendation: 'Please log some vitals first.', anomalies: [] });
    }

    const member = await FamilyMember.findById(req.params.memberId);

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
// FAMILY CIRCLE MANAGEMENT ROUTES
// ─────────────────────────────────────────────

// Get details about my current circle
app.get('/api/circle/details', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('familyCircleId');
    if (!user?.familyCircleId) return res.status(404).json({ error: 'Circle not found' });

    const circle = await FamilyCircle.findById(user.familyCircleId).populate('members', 'email name');
    res.json(circle);
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
    await User.findByIdAndUpdate(invitee._id, { 
      $push: { pendingInvites: { circleId: req.user.familyCircleId, invitedBy: req.userId } } 
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
    if (user.familyCircleId) {
        await FamilyCircle.findByIdAndUpdate(user.familyCircleId, { $pull: { members: userId } });
    }

    // 2. Join new circle
    user.familyCircleId = circleId;
    newCircle.members.push(userId);
    newCircle.pendingInvites = newCircle.pendingInvites.filter(e => e !== user.email.toLowerCase());
    
    await user.save();
    await newCircle.save();

    // 3. MERGE DATA (Safety Net): Move my family members to the new circle
    const result = await FamilyMember.updateMany(
        { userId: userId }, 
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
app.listen(PORT, () => {
  console.log(`🚀 Express server running on http://localhost:${PORT}`);
});
