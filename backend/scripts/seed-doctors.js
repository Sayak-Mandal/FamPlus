/**
 * @file seed-doctors.js
 * @description Database seeding script for the Doctor model.
 * Destroys any existing doctor records and populates the database with a fresh
 * set of mock doctors. Used for local development and testing the doctor 
 * recommendation features.
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables from the root directory .env file
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const Doctor = require('../models/Doctor');

// Determine correct connection string
// Fallbacks are provided in case different env variable names are used
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/famplus';

/**
 * Array of initial doctor seed data.
 * Contains GPS coordinates (lat/lng) which are critical for the
 * location-based "nearby doctors" mapping features.
 */
const doctorsData = [
    { id: "1", name: "Dr. Anirban Roy", specialty: "Cardiologist", hospital: "Apollo Gleneagles Hospital", lat: 22.5735, lng: 88.3992, rating: 4.8 },
    { id: "2", name: "Dr. Sutanu Ghosh", specialty: "Cardiologist", hospital: "BM Birla Heart Research Centre", lat: 22.5328893, lng: 88.3282827, rating: 4.7 },
    { id: "14", name: "Dr. P.K. Deb", specialty: "Cardiologist", hospital: "Calcutta Medical Research Institute", lat: 22.5393, lng: 88.3275, rating: 4.9 },
    { id: "3", name: "Dr. Rina Das", specialty: "Dermatologist", hospital: "Skin Care Clinic", lat: 22.5626, lng: 88.3539, rating: 4.5 },
    { id: "4", name: "Dr. Samir Sen", specialty: "Dermatologist", hospital: "Fortis Hospital", lat: 22.5186, lng: 88.3995, rating: 4.6 },
    { id: "15", name: "Dr. Sachin Varma", specialty: "Dermatologist", hospital: "Salt Lake City Medical Centre", lat: 22.5868, lng: 88.4172, rating: 4.7 },
    { id: "5", name: "Dr. Priya Sharma", specialty: "General Physician", hospital: "Woodlands Hospital", lat: 22.5323, lng: 88.3312, rating: 4.3 },
    { id: "16", name: "Dr. Rahul Mitra", specialty: "General Physician", hospital: "Pearls Of God", lat: 22.5646, lng: 88.3433, rating: 4.4 },
    { id: "17", name: "Dr. S.K. Gupta", specialty: "General Physician", hospital: "Ruby General Hospital", lat: 22.5126, lng: 88.4013, rating: 4.5 },
    { id: "6", name: "Dr. Amitava Banerjee", specialty: "Neurologist", hospital: "Institute of Neurosciences", lat: 22.5451, lng: 88.3643, rating: 4.9 },
    { id: "18", name: "Dr. Hrishikesh Kumar", specialty: "Neurologist", hospital: "Institute of Neurosciences", lat: 22.5455, lng: 88.3645, rating: 4.8 },
    { id: "19", name: "Dr. V.K. Das", specialty: "Neurologist", hospital: "AMRI Hospital, Salt Lake", lat: 22.5726, lng: 88.4139, rating: 4.7 },
    { id: "7", name: "Dr. Tapa Jyoti", specialty: "Pediatrician", hospital: "Bhagirathi Neotia Woman and Child Care Centre", lat: 22.5480, lng: 88.3590, rating: 4.8 },
    { id: "20", name: "Dr. S.K. Chatterjee", specialty: "Pediatrician", hospital: "Park Children's Centre", lat: 22.5448, lng: 88.3563, rating: 4.9 },
    { id: "8", name: "Dr. Kunal Sarkar", specialty: "Orthopedic", hospital: "Medica Superspecialty Hospital", lat: 22.4981, lng: 88.4038, rating: 4.7 },
    { id: "10", name: "Dr. Mahesh Goenka", specialty: "Gastroenterologist", hospital: "Apollo Gleneagles", lat: 22.5735, lng: 88.3992, rating: 4.9 },
    { id: "13", name: "Dr. Arjun Das", specialty: "ENT Specialist", hospital: "AMRI Hospital", lat: 22.5150, lng: 88.3600, rating: 4.6 },
    { id: "29", name: "Dr. Himadri Roy", specialty: "Sleep Specialist", hospital: "Sleep Study Centre, Kolkata", lat: 22.5850, lng: 88.3900, rating: 4.7 },
    { id: "30", name: "Dr. S. Mukherjee", specialty: "Sleep Specialist", hospital: "Belle Vue Clinic", lat: 22.5460, lng: 88.3540, rating: 4.8 },
    { id: "31", name: "Dr. Amitabha Chowdhury", specialty: "Hepatologist", hospital: "Liver Foundation, Kolkata", lat: 22.5510, lng: 88.3620, rating: 4.9 },
    { id: "32", name: "Dr. Abhijit Das", specialty: "Hepatologist", hospital: "IPGMER & SSKM Hospital", lat: 22.5390, lng: 88.3440, rating: 4.6 },
];

/**
 * Main seeding execution function.
 * Connects to MongoDB, flushes the Doctor collection, and inserts fresh data.
 * Will forcefully exit the process with status 0 on success or 1 on failure.
 */
async function seedDoctors() {
    try {
        console.log('🚀 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // DANGER: Destroys all current doctors before inserting
        console.log('🗑️ Clearing existing doctors...');
        await Doctor.deleteMany({});

        console.log('🌱 Seeding doctors...');
        // Map raw JS objects into the structure expected by the Mongoose schema
        const doctorsToSeed = doctorsData.map(d => ({
            name: d.name,
            specialty: d.specialty,
            lat: d.lat,
            lng: d.lng,
            address: d.hospital, // We use the hospital name as their primary address text
            phone: "+91-33-22221111", // Placeholder mock data
            email: `${d.name.toLowerCase().replace(' ', '.')}@example.com`,
            rating: d.rating || 4.5
        }));

        // Batch insert for performance
        await Doctor.insertMany(doctorsToSeed);
        console.log(`✅ Successfully seeded ${doctorsToSeed.length} doctors.`);
        
        // Terminate successfully
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding error:', err);
        // Terminate with explicit failure status
        process.exit(1);
    }
}

// Kick off the seeding process when file is run directly
seedDoctors();
