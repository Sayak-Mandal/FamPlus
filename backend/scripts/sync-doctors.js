const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const Doctor = require('../models/Doctor');

const doctors = [
    // Cardiologists
    {
        name: "Dr. Anirban Roy",
        specialty: "Cardiologist",
        rating: 4.8,
        hospital: "Apollo Multispecialty Hospital",
        address: "58, Canal Circular Rd, Kadapara, Phool Bagan, Kankurgachi, Kolkata, West Bengal 700054",
        lat: 22.5645,
        lng: 88.3965,
        phone: "+91 9123456789"
    },
    {
        name: "Dr. Sutanu Ghosh",
        specialty: "Cardiologist",
        rating: 4.7,
        hospital: "BM Birla Heart Research Centre",
        address: "1/1, National Library Ave, Alipore, Kolkata, West Bengal 700027",
        lat: 22.5328893,
        lng: 88.3282827,
        phone: "+91 9486526499"
    },
    {
        name: "Dr. Mihir Kumar Das",
        specialty: "Cardiologist",
        rating: 4.9,
        hospital: "Fortis Hospital, Anandapur",
        address: "730, Anandapur, E.M. Bypass Road, Kolkata, West Bengal 700107",
        lat: 22.5165,
        lng: 88.3970,
        phone: "+91 9831012345"
    },
    {
        name: "Dr. Arpan Chakraverty",
        specialty: "Cardiologist",
        rating: 4.6,
        hospital: "RTIICS (Rabindranath Tagore International Institute of Cardiac Sciences)",
        address: "124, Mukundapur Main Rd, Premtala, Mukundapur, Kolkata, West Bengal 700099",
        lat: 22.5603,
        lng: 88.4094,
        phone: "+91 9051012345"
    },
    {
        name: "Dr. Amitabha Chattopadhyay",
        specialty: "Cardiologist",
        rating: 4.8,
        hospital: "Medica Superspecialty Hospital",
        address: "127, Mukundapur Main Rd, Nitai Nagar, Mukundapur, Kolkata, West Bengal 700099",
        lat: 22.4942,
        lng: 88.4008,
        phone: "+91 9073312345"
    },

    // Neurologists
    {
        name: "Dr. Hrishikesh Kumar",
        specialty: "Neurologist",
        rating: 4.9,
        hospital: "AMRI Hospital, Dhakuria",
        address: "P-4, 5, Gariahat Rd, Block A, Dhakuria, Kolkata, West Bengal 700029",
        lat: 22.5125,
        lng: 88.3676,
        phone: "+91 9830012345"
    },
    {
        name: "Dr. Tapas Kumar Banerjee",
        specialty: "Neurologist",
        rating: 4.7,
        hospital: "Peerless Hospital",
        address: "360, Pancha Sayyar, Kolkata, West Bengal 700094",
        lat: 22.4810,
        lng: 88.3938,
        phone: "+91 9831112345"
    },
    {
        name: "Dr. Goutam Ganguly",
        specialty: "Neurologist",
        rating: 4.8,
        hospital: "Belle Vue Clinic",
        address: "9, Loudon St, Elgin, Kolkata, West Bengal 700017",
        lat: 22.5425,
        lng: 88.3549,
        phone: "+91 9831212345"
    },
    {
        name: "Dr. B.K. Singh",
        specialty: "Neurologist",
        rating: 4.6,
        hospital: "CMRI (Calcutta Medical Research Institute)",
        address: "7/2, Diamond Harbour Rd, Alipore, Kolkata, West Bengal 700027",
        lat: 22.5264,
        lng: 88.3266,
        phone: "+91 9831312345"
    },

    // Orthopedists
    {
        name: "Dr. Ronen Roy",
        specialty: "Orthopedist",
        rating: 4.9,
        hospital: "Woodlands Hospital",
        address: "8/5, Alipore Rd, Alipore, Kolkata, West Bengal 700027",
        lat: 22.5322,
        lng: 88.3289,
        phone: "+91 9831412345"
    },
    {
        name: "Dr. Gaurav Gupta",
        specialty: "Orthopedist",
        rating: 4.7,
        hospital: "Ruby General Hospital",
        address: "576, Anandapur, E.M. Bypass, Kasba Golpark, Kolkata, West Bengal 700107",
        lat: 22.5135,
        lng: 88.4030,
        phone: "+91 9831512345"
    },
    {
        name: "Dr. Vikash Kapoor",
        specialty: "Orthopedist",
        rating: 4.8,
        hospital: "Medica Superspecialty Hospital",
        address: "127, Mukundapur Main Rd, Kolkata, West Bengal 700099",
        lat: 22.4942,
        lng: 88.4008,
        phone: "+91 9831612345"
    },

    // Pediatricians
    {
        name: "Dr. Jaydeep Choudhury",
        specialty: "Pediatrician",
        rating: 4.8,
        hospital: "Apollo Multispecialty Hospital",
        address: "58, Canal Circular Rd, Kadapara, Phool Bagan, Kankurgachi, Kolkata, West Bengal 700054",
        lat: 22.5645,
        lng: 88.3965,
        phone: "+91 9831712345"
    },
    {
        name: "Dr. Apurba Ghosh",
        specialty: "Pediatrician",
        rating: 4.9,
        hospital: "AMRI Hospital, Salt Lake",
        address: "JC-16 & 17, Sector III, Salt Lake City, Kolkata, West Bengal 700098",
        lat: 22.5714,
        lng: 88.4116,
        phone: "+91 9831812345"
    },
    {
        name: "Dr. Atanu Bhadra",
        specialty: "Pediatrician",
        rating: 4.6,
        hospital: "Peerless Hospital",
        address: "360, Pancha Sayyar, Kolkata, West Bengal 700094",
        lat: 22.4810,
        lng: 88.3938,
        phone: "+91 9831912345"
    },

    // Ophthalmologists
    {
        name: "Dr. S. Natarajan",
        specialty: "Ophthalmologist",
        rating: 4.6,
        hospital: "Susrut Eye Foundation",
        address: "HB-36/A/1, Sector-III, Salt Lake City, Kolkata, WB 700106",
        lat: 22.5762,
        lng: 88.3845,
        phone: "+91 9832012345"
    },
    {
        name: "Dr. Abhijit Das",
        specialty: "Ophthalmologist",
        rating: 4.7,
        hospital: "Nightingale Hospital",
        address: "11, Shakespeare Sarani Rd, Kolkata, WB 700071",
        lat: 22.5460,
        lng: 88.3515,
        phone: "+91 9832112233"
    },

    // General Physicians
    {
        name: "Dr. Subhankar Chowdhury",
        specialty: "General Physician",
        rating: 4.8,
        hospital: "Belle Vue Clinic",
        address: "9, Loudon St, Kolkata, WB 700017",
        lat: 22.5425,
        lng: 88.3549,
        phone: "+91 9832212345"
    },
    {
        name: "Dr. Syamsundsh Ghosh",
        specialty: "General Physician",
        rating: 4.5,
        hospital: "Desun Hospital",
        address: "720, Anandapur, EM Bypass, Kolkata, West Bengal 700107",
        lat: 22.5262,
        lng: 88.4033,
        phone: "+91 9832312345"
    },
    {
        name: "Dr. P.K. Saha",
        specialty: "General Physician",
        rating: 4.7,
        hospital: "Kothari Medical Centre",
        address: "8/3, Alipore Rd, Kolkata, West Bengal 700027",
        lat: 22.5322,
        lng: 88.3289,
        phone: "+91 9832412345"
    },

    // ENT Specialists
    {
        name: "Dr. Arjun Dasgupta",
        specialty: "ENT Specialist",
        rating: 4.8,
        hospital: "ILS Hospital, Salt Lake",
        address: "DD-6, Sector 1, Salt Lake City, Kolkata, West Bengal 700064",
        lat: 22.5855,
        lng: 88.4137,
        phone: "+91 9832512345"
    },
    {
        name: "Dr. Shantanu Panigrahi",
        specialty: "ENT Specialist",
        rating: 4.6,
        hospital: "Zenith Super Specialist Hospital",
        address: "9/3, Feeder Rd, Belghoria, Kolkata, West Bengal 700056",
        lat: 22.6841,
        lng: 88.3765,
        phone: "+91 9832612345"
    },
    {
        name: "Dr. Manoj Mukherjee",
        specialty: "ENT Specialist",
        rating: 4.7,
        hospital: "Charnock Hospital",
        address: "Rajarhat Main Rd, Teghoria, Newtown, Kolkata, West Bengal 700157",
        lat: 22.6358,
        lng: 88.4238,
        phone: "+91 9832712345"
    },

    // Dermatologists
    {
        name: "Dr. Rina Das",
        specialty: "Dermatologist",
        rating: 4.5,
        hospital: "AMRI Hospital, Dhakuria",
        address: "P-4, 5, Gariahat Rd, Block A, Dhakuria, Kolkata, West Bengal 700029",
        lat: 22.5125,
        lng: 88.3676,
        phone: "+91 9414327059"
    },
    {
        name: "Dr. Samir Sen",
        specialty: "Dermatologist",
        rating: 4.6,
        hospital: "Fortis Hospital, Anandapur",
        address: "730, EM Bypass, Anandapur, East Kolkata Twp, Kolkata, WB 700107",
        lat: 22.5165,
        lng: 88.3970,
        phone: "+91 9360373426"
    },

    // Gastroenterologists
    {
        name: "Dr. Mahesh Goenka",
        specialty: "Gastroenterologist",
        rating: 4.9,
        hospital: "Apollo Multispecialty Hospital",
        address: "58, Canal Circular Rd, Kadapara, Phool Bagan, Kankurgachi, Kolkata, WB 700054",
        lat: 22.5645,
        lng: 88.3965,
        phone: "+91 9484077966"
    },
    {
        name: "Dr. Sanjay Chowdhury",
        specialty: "Gastroenterologist",
        rating: 4.5,
        hospital: "CMRI (Calcutta Medical Research Institute)",
        address: "7/2, Diamond Harbour Rd, Alipore, Kolkata, WB 700027",
        lat: 22.5264,
        lng: 88.3266,
        phone: "+91 9375105073"
    },

    // Sleep Specialists
    {
        name: "Dr. Himadri Roy",
        specialty: "Sleep Specialist",
        rating: 4.7,
        hospital: "AMRI Hospital, Dhakuria",
        address: "P-4, 5, Gariahat Rd, Block A, Dhakuria, Kolkata, West Bengal 700029",
        lat: 22.5125,
        lng: 88.3676,
        phone: "+91 9101200062"
    },
    {
        name: "Dr. S. Mukherjee",
        specialty: "Sleep Specialist",
        rating: 4.8,
        hospital: "Belle Vue Clinic",
        address: "9, Loudon St, Kolkata, WB 700017",
        lat: 22.5425,
        lng: 88.3549,
        phone: "+91 9435323143"
    },

    // Hepatologists
    {
        name: "Dr. Amitabha Chowdhury",
        specialty: "Hepatologist",
        rating: 4.9,
        hospital: "Medica Superspecialty Hospital",
        address: "127, Mukundapur Main Rd, Nitai Nagar, Mukundapur, Kolkata, West Bengal 700099",
        lat: 22.4942,
        lng: 88.4008,
        phone: "+91 9978550617"
    },
    {
        name: "Dr. Abhijit Das",
        specialty: "Hepatologist",
        rating: 4.6,
        hospital: "IPGMER & SSKM Hospital",
        address: "244, AJC Bose Rd, Alipore, Kolkata, WB 700020",
        lat: 22.5390,
        lng: 88.3409,
        phone: "+91 9132236087"
    }
];

async function syncDoctors() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Clear existing doctors
        await Doctor.deleteMany({});
        console.log('Cleared existing doctors');

        // Insert new doctors
        await Doctor.insertMany(doctors);
        console.log(`Successfully synced ${doctors.length} doctors with high-precision coordinates.`);

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    } catch (error) {
        console.error('Error syncing doctors:', error);
        process.exit(1);
    }
}

syncDoctors();
