/**
 * Fix Script: Reset anomalous heart rate values for the Famplus demo user.
 * - Anita (Mother): 740 bpm → 74 bpm  
 * - John (Self): 10 bpm → 72 bpm
 * Also resets any heart rate < 30 or > 300 (physically impossible) to a safe default.
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/famplus';

const FamilyMemberSchema = new mongoose.Schema({}, { strict: false });
const FamilyMember = mongoose.model('FamilyMember', FamilyMemberSchema);

async function fixHeartRates() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const members = await FamilyMember.find({});
  let fixCount = 0;

  for (const m of members) {
    const name = m.get('name');
    const relation = m.get('relation');
    const hr = m.get('heartRate');

    if (hr === null || hr === undefined) continue;

    // Define sane defaults per relation
    let fixedHr = null;

    if (hr > 300 || hr < 30) {
      // Completely impossible — reset
      if (name === 'John' && relation === 'Self')     fixedHr = 72;
      else if (relation === 'Mother')                  fixedHr = 74;
      else if (relation === 'Father')                  fixedHr = 78;
      else                                             fixedHr = 72; // generic safe default
    }

    if (fixedHr !== null) {
      await FamilyMember.updateOne({ _id: m._id }, { $set: { heartRate: fixedHr } });
      console.log(`🔧 Fixed ${name} (${relation}): ${hr} bpm → ${fixedHr} bpm`);
      fixCount++;
    }
  }

  if (fixCount === 0) {
    console.log('✅ No anomalous heart rates found — all values are within valid range (30–300 bpm).');
  } else {
    console.log(`\n✅ Fixed ${fixCount} member(s) with anomalous heart rate values.`);
  }

  await mongoose.disconnect();
  console.log('Disconnected.');
}

fixHeartRates().catch((err) => {
  console.error('❌ Fix script failed:', err);
  process.exit(1);
});
