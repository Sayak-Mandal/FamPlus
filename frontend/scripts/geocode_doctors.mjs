/**
 * geocode_doctors.mjs
 *
 * Uses the Nominatim (OpenStreetMap) geocoding API to fetch accurate lat/lng
 * for every doctor in doctors.ts and prints an updated TypeScript file to stdout.
 *
 * Usage: node scripts/geocode_doctors.mjs > src/lib/data/doctors_geocoded.ts
 *
 * Nominatim rate limit: 1 request per second (enforced below).
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// --- Inline doctor data (mirrors doctors.ts so we don't need a TS importer) ---
const doctors = [
  { id:"1",  name:"Dr. Anirban Roy",              specialty:"Cardiologist",                   hospital:"Apollo Multispecialty Hospital",         lat:22.5645, lng:88.3965, rating:4.8, phone:"+91 9123456789", address:"58, Canal Circular Rd, Kadapara, Phool Bagan, Kankurgachi, Kolkata, West Bengal 700054" },
  { id:"2",  name:"Dr. Sutanu Ghosh",             specialty:"Cardiologist",                   hospital:"BM Birla Heart Research Centre",          lat:22.5328893, lng:88.3282827, rating:4.7, phone:"+91 9486526499", address:"1/1, National Library Ave, Alipore, Kolkata, West Bengal 700027" },
  { id:"14", name:"Dr. Mihir Kumar Das",          specialty:"Cardiologist",                   hospital:"Fortis Hospital, Anandapur",              lat:22.5165, lng:88.3970, rating:4.9, phone:"+91 9831012345", address:"730, Anandapur, E.M. Bypass Road, Kolkata, West Bengal 700107" },
  { id:"3",  name:"Dr. Rina Das",                specialty:"Dermatologist",                  hospital:"AMRI Hospital, Dhakuria",                 lat:22.5125, lng:88.3676, rating:4.5, phone:"+91 9414327059", address:"P-4, 5, Gariahat Rd, Block A, Dhakuria, Kolkata, West Bengal 700029" },
  { id:"4",  name:"Dr. Samir Sen",               specialty:"Dermatologist",                  hospital:"Fortis Hospital, Anandapur",              lat:22.5165, lng:88.3970, rating:4.6, phone:"+91 9360373426", address:"730, EM Bypass, Anandapur, East Kolkata Twp, Kolkata, WB 700107" },
  { id:"15", name:"Dr. Sachin Varma",            specialty:"Dermatologist",                  hospital:"AMRI Hospital, Salt Lake",                lat:22.5714, lng:88.4116, rating:4.7, phone:"+91 9412459656", address:"JC-16 & 17, Sector III, Salt Lake City, Kolkata, West Bengal 700098" },
  { id:"5",  name:"Dr. Priya Sharma",            specialty:"General Physician",              hospital:"Woodlands Hospital",                      lat:22.5322, lng:88.3289, rating:4.3, phone:"+91 9141228207", address:"8/5, Alipore Rd, Alipore, Kolkata, WB 700027" },
  { id:"16", name:"Dr. Rahul Mitra",             specialty:"General Physician",              hospital:"Nightingale Hospital",                    lat:22.5460, lng:88.3515, rating:4.4, phone:"+91 9935518697", address:"11, Shakespeare Sarani Rd, Kolkata, WB 700071" },
  { id:"17", name:"Dr. S.K. Gupta",              specialty:"General Physician",              hospital:"Ruby General Hospital",                   lat:22.5135, lng:88.4030, rating:4.5, phone:"+91 9205967426", address:"576, Anandapur, E.M. Bypass, Kasba Golpark, Kolkata, West Bengal 700107" },
  { id:"6",  name:"Dr. Amitava Banerjee",        specialty:"Neurologist",                    hospital:"Medica Superspecialty Hospital",          lat:22.4942, lng:88.4008, rating:4.9, phone:"+91 9639917428", address:"127, Mukundapur Main Rd, Nitai Nagar, Mukundapur, Kolkata, West Bengal 700099" },
  { id:"18", name:"Dr. Hrishikesh Kumar",        specialty:"Neurologist",                    hospital:"AMRI Hospital, Dhakuria",                 lat:22.5125, lng:88.3676, rating:4.8, phone:"+91 9863996301", address:"P-4, 5, Gariahat Rd, Block A, Dhakuria, Kolkata, West Bengal 700029" },
  { id:"19", name:"Dr. V.K. Das",               specialty:"Neurologist",                    hospital:"AMRI Hospital, Salt Lake",                lat:22.5714, lng:88.4116, rating:4.7, phone:"+91 9474339369", address:"JC-16 & 17, Salt Lake City, Sector III, Kolkata, WB 700106" },
  { id:"7",  name:"Dr. Tapa Jyoti",             specialty:"Pediatrician",                   hospital:"Apollo Multispecialty Hospital",          lat:22.5645, lng:88.3965, rating:4.8, phone:"+91 9213052579", address:"58, Canal Circular Rd, Kadapara, Phool Bagan, Kankurgachi, Kolkata, West Bengal 700054" },
  { id:"20", name:"Dr. Apurba Ghosh",           specialty:"Pediatrician",                   hospital:"AMRI Hospital, Salt Lake",                lat:22.5714, lng:88.4116, rating:4.9, phone:"+91 9044677885", address:"JC-16 & 17, Sector III, Salt Lake City, Kolkata, West Bengal 700098" },
  { id:"21", name:"Dr. Sumita Saha",            specialty:"Pediatrician",                   hospital:"Fortis Hospital, Anandapur",              lat:22.5165, lng:88.3970, rating:4.7, phone:"+91 9214465980", address:"730, EM Bypass, Anandapur, East Kolkata Twp, Kolkata, WB 700107" },
  { id:"8",  name:"Dr. Kunal Sarkar",           specialty:"Orthopedic",                     hospital:"Medica Superspecialty Hospital",          lat:22.4942, lng:88.4008, rating:4.7, phone:"+91 9357560801", address:"127, Mukundapur Main Rd, Nitai Nagar, Mukundapur, Kolkata, West Bengal 700099" },
  { id:"22", name:"Dr. Rajeev Sharma",          specialty:"Orthopedic",                     hospital:"Apollo Multispecialty Hospital",          lat:22.5645, lng:88.3965, rating:4.8, phone:"+91 9413500310", address:"58, Canal Circular Rd, Kadapara, Phool Bagan, Kankurgachi, Kolkata, West Bengal 700054" },
  { id:"23", name:"Dr. Anindya Bose",           specialty:"Orthopedic",                     hospital:"Peerless Hospital",                       lat:22.4810, lng:88.3938, rating:4.6, phone:"+91 9987193202", address:"360, Pancha Sayyar, Kolkata, West Bengal 700094" },
  { id:"9",  name:"Dr. S. Natarajan",           specialty:"Ophthalmologist",               hospital:"Susrut Eye Foundation",                   lat:22.5762, lng:88.3845, rating:4.6, phone:"+91 9258512716", address:"HB-36/A/1, Sector-III, Salt Lake City, Kolkata, WB 700106" },
  { id:"24", name:"Dr. Debasish Bhattacharya",  specialty:"Ophthalmologist",               hospital:"Nightingale Hospital",                    lat:22.5460, lng:88.3515, rating:4.8, phone:"+91 9468013856", address:"11, Shakespeare Sarani Rd, Kolkata, WB 700071" },
  { id:"10", name:"Dr. Mahesh Goenka",          specialty:"Gastroenterologist",             hospital:"Apollo Multispecialty Hospital",          lat:22.5645, lng:88.3965, rating:4.9, phone:"+91 9484077966", address:"58, Canal Circular Rd, Kadapara, Phool Bagan, Kankurgachi, Kolkata, West Bengal 700054" },
  { id:"25", name:"Dr. Sanjay Chowdhury",       specialty:"Gastroenterologist",             hospital:"CMRI (Calcutta Medical Research Institute)", lat:22.5264, lng:88.3266, rating:4.5, phone:"+91 9375105073", address:"7/2, Diamond Harbour Rd, Alipore, Kolkata, WB 700027" },
  { id:"11", name:"Dr. Rajiv Khanna",           specialty:"Dentist",                        hospital:"Kothari Medical Centre",                  lat:22.5322, lng:88.3289, rating:4.5, phone:"+91 9019104733", address:"8/3, Alipore Rd, Kolkata, West Bengal 700027" },
  { id:"26", name:"Dr. Anjali Agarwal",         specialty:"Dentist",                        hospital:"Belle Vue Clinic",                        lat:22.5425, lng:88.3549, rating:4.7, phone:"+91 9044803552", address:"9, Loudon St, Kolkata, WB 700017" },
  { id:"12", name:"Dr. Jai Ranjan Ram",         specialty:"Psychiatrist",                   hospital:"Belle Vue Clinic",                        lat:22.5425, lng:88.3549, rating:4.8, phone:"+91 9148654003", address:"9, Loudon St, Kolkata, WB 700017" },
  { id:"27", name:"Dr. S. Nandi",              specialty:"Psychiatrist",                   hospital:"Peerless Hospital",                       lat:22.4810, lng:88.3938, rating:4.6, phone:"+91 9497050680", address:"360, Pancha Sayyar, Kolkata, West Bengal 700094" },
  { id:"13", name:"Dr. Arjun Das",             specialty:"ENT Specialist",                 hospital:"AMRI Hospital, Dhakuria",                 lat:22.5125, lng:88.3676, rating:4.6, phone:"+91 9988117890", address:"P-4, 5, Gariahat Rd, Block A, Dhakuria, Kolkata, West Bengal 700029" },
  { id:"28", name:"Dr. Dulal Basu",            specialty:"ENT Specialist",                 hospital:"ILS Hospital, Salt Lake",                 lat:22.5855, lng:88.4137, rating:4.5, phone:"+91 9259286374", address:"DD-6, Sector 1, Salt Lake City, Kolkata, West Bengal 700064" },
  { id:"29", name:"Dr. Himadri Roy",           specialty:"Sleep Specialist",               hospital:"AMRI Hospital, Dhakuria",                 lat:22.5125, lng:88.3676, rating:4.7, phone:"+91 9101200062", address:"P-4, 5, Gariahat Rd, Block A, Dhakuria, Kolkata, West Bengal 700029" },
  { id:"30", name:"Dr. S. Mukherjee",          specialty:"Sleep Specialist",               hospital:"Belle Vue Clinic",                        lat:22.5425, lng:88.3549, rating:4.8, phone:"+91 9435323143", address:"9, Loudon St, Kolkata, WB 700017" },
  { id:"31", name:"Dr. Amitabha Chowdhury",    specialty:"Hepatologist",                   hospital:"Medica Superspecialty Hospital",          lat:22.4942, lng:88.4008, rating:4.9, phone:"+91 9978550617", address:"127, Mukundapur Main Rd, Nitai Nagar, Mukundapur, Kolkata, West Bengal 700099" },
  { id:"32", name:"Dr. Abhijit Das",           specialty:"Hepatologist",                   hospital:"IPGMER & SSKM Hospital",                  lat:22.5390, lng:88.3409, rating:4.6, phone:"+91 9132236087", address:"244, AJC Bose Rd, Alipore, Kolkata, WB 700020" },
  { id:"33", name:"Dr. Shantanu Panja",        specialty:"ENT Specialist",                 hospital:"Apollo Multispeciality Hospitals",        lat:22.5746, lng:88.4019, rating:4.8, phone:"+91 33 2320 3040", address:"58, Canal Circular Rd, Kadapara, Phool Bagan, Kankurgachi, Kolkata, West Bengal 700054" },
  { id:"34", name:"Dr. Abhik Ghosh",           specialty:"ENT Specialist",                 hospital:"Apollo Multispeciality Hospitals",        lat:22.5746, lng:88.4019, rating:4.7, phone:"+91 33 2320 3040", address:"58, Canal Circular Rd, Kadapara, Phool Bagan, Kankurgachi, Kolkata, West Bengal 700054" },
  { id:"35", name:"Dr. Bhaskar Narayan Chaudhuri", specialty:"Infectious Disease Specialist", hospital:"School of Tropical Medicine",           lat:22.5390, lng:88.3513, rating:4.9, phone:"+91 9831112233", address:"108, Chittaranjan Ave, Shyambazar, Kolkata, West Bengal 700073" },
  { id:"36", name:"Dr. Koel Bhattacharyya",    specialty:"Infectious Disease Specialist",  hospital:"Medica Superspecialty Hospital",          lat:22.4942, lng:88.4008, rating:4.7, phone:"+91 9874223311", address:"127, Mukundapur Main Rd, Nitai Nagar, Mukundapur, Kolkata, West Bengal 700099" },
  { id:"37", name:"Dr. Supriyo Chakravarti",   specialty:"Infectious Disease Specialist",  hospital:"AMRI Hospital, Salt Lake",                lat:22.5714, lng:88.4116, rating:4.8, phone:"+91 9433114455", address:"JC-16 & 17, Sector III, Salt Lake City, Kolkata, West Bengal 700098" },
  { id:"38", name:"Dr. Saibal Moitra",         specialty:"Pulmonologist",                  hospital:"Apollo Multispecialty Hospital",          lat:22.5645, lng:88.3965, rating:4.8, phone:"+91 9831098765", address:"58, Canal Circular Rd, Kadapara, Phool Bagan, Kankurgachi, Kolkata, West Bengal 700054" },
  { id:"39", name:"Dr. Parthasarathi Bhattacharyya", specialty:"Pulmonologist",           hospital:"Peerless Hospital",                       lat:22.4810, lng:88.3938, rating:4.7, phone:"+91 9748233445", address:"360, Pancha Sayyar, Kolkata, West Bengal 700094" },
  { id:"40", name:"Dr. Pradip Mukhopadhyay",   specialty:"Endocrinologist",                hospital:"AMRI Hospital, Dhakuria",                 lat:22.5125, lng:88.3676, rating:4.9, phone:"+91 9831556677", address:"P-4, 5, Gariahat Rd, Block A, Dhakuria, Kolkata, West Bengal 700029" },
  { id:"41", name:"Dr. Rana Bhattacharjee",    specialty:"Endocrinologist",                hospital:"Ruby General Hospital",                   lat:22.5135, lng:88.4030, rating:4.6, phone:"+91 9674556677", address:"576, Anandapur, E.M. Bypass, Kasba Golpark, Kolkata, West Bengal 700107" },
  { id:"42", name:"Dr. Alakendu Ghosh",        specialty:"Rheumatologist",                 hospital:"IPGMER & SSKM Hospital",                  lat:22.5390, lng:88.3409, rating:4.8, phone:"+91 9830778899", address:"244, AJC Bose Rd, Alipore, Kolkata, WB 700020" },
  { id:"43", name:"Dr. Sumantro Mondal",       specialty:"Rheumatologist",                 hospital:"Fortis Hospital, Anandapur",              lat:22.5165, lng:88.3970, rating:4.7, phone:"+91 9831445566", address:"730, Anandapur, E.M. Bypass Road, Kolkata, West Bengal 700107" },
  { id:"44", name:"Dr. Sukanta Bhattacharyya", specialty:"Allergist",                      hospital:"Kothari Medical Centre",                  lat:22.5322, lng:88.3289, rating:4.6, phone:"+91 9830334455", address:"8/3, Alipore Rd, Kolkata, West Bengal 700027" },
  { id:"45", name:"Dr. Prasanta Bhattacharyya",specialty:"Allergist",                      hospital:"Medica Superspecialty Hospital",          lat:22.4942, lng:88.4008, rating:4.7, phone:"+91 9748112233", address:"127, Mukundapur Main Rd, Nitai Nagar, Mukundapur, Kolkata, West Bengal 700099" },
  { id:"46", name:"Dr. Nirmalya Roy Choudhury",specialty:"Urologist",                      hospital:"Apollo Multispecialty Hospital",          lat:22.5645, lng:88.3965, rating:4.8, phone:"+91 9831667788", address:"58, Canal Circular Rd, Kadapara, Phool Bagan, Kankurgachi, Kolkata, West Bengal 700054" },
  { id:"47", name:"Dr. Arup Kumar Majumdar",   specialty:"Urologist",                      hospital:"Woodlands Hospital",                      lat:22.5322, lng:88.3289, rating:4.7, phone:"+91 9748556677", address:"8/5, Alipore Rd, Alipore, Kolkata, WB 700027" },
  { id:"48", name:"Dr. Pradipta Roy Chowdhury",specialty:"Vascular Surgeon",               hospital:"Belle Vue Clinic",                        lat:22.5425, lng:88.3549, rating:4.8, phone:"+91 9831223344", address:"9, Loudon St, Kolkata, WB 700017" },
  { id:"49", name:"Dr. Swapan Chatterjee",     specialty:"Vascular Surgeon",               hospital:"Peerless Hospital",                       lat:22.4810, lng:88.3938, rating:4.6, phone:"+91 9748334455", address:"360, Pancha Sayyar, Kolkata, West Bengal 700094" },
];

// Unique hospital→address pairs to geocode (no need to hit Nominatim per doctor for shared addresses)
const addressMap = new Map(); // address -> { lat, lng }

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function geocode(address) {
  if (addressMap.has(address)) return addressMap.get(address);

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=in`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FamPlus-dev-geocoder/1.0 (contact@famplus.local)' }
    });
    const data = await res.json();
    if (data && data.length > 0) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      addressMap.set(address, coords);
      return coords;
    }
  } catch (e) {
    console.error(`  ✗ Failed to geocode: ${address}`, e.message);
  }
  return null;
}

async function main() {
  console.error('🌍 Geocoding doctor addresses via Nominatim (1 req/sec)...\n');

  const updated = [];
  for (const doc of doctors) {
    process.stderr.write(`  [${doc.id}] ${doc.name} — ${doc.hospital}...`);
    const coords = await geocode(doc.address);
    await sleep(1200); // Nominatim rate limit: 1 req/sec

    if (coords) {
      const latChanged = Math.abs(coords.lat - doc.lat) > 0.0001;
      const lngChanged = Math.abs(coords.lng - doc.lng) > 0.0001;
      if (latChanged || lngChanged) {
        process.stderr.write(` ✓ UPDATED (${doc.lat},${doc.lng}) → (${coords.lat.toFixed(6)},${coords.lng.toFixed(6)})\n`);
      } else {
        process.stderr.write(` ✓ OK\n`);
      }
      updated.push({ ...doc, lat: coords.lat, lng: coords.lng });
    } else {
      process.stderr.write(` ✗ KEPT ORIGINAL\n`);
      updated.push(doc);
    }
  }

  // Output the updated TypeScript file
  const lines = [
    `export interface Doctor {`,
    `    id: string`,
    `    name: string`,
    `    specialty: string`,
    `    hospital: string`,
    `    lat: number`,
    `    lng: number`,
    `    rating: number`,
    `    phone: string`,
    `    address: string`,
    `}`,
    ``,
    `// Center: Kolkata (22.5726, 88.3639)`,
    `// Coordinates geocoded via Nominatim (OpenStreetMap) on ${new Date().toISOString().split('T')[0]}`,
    `export const doctors: Doctor[] = [`,
  ];

  let lastSpecialty = '';
  for (const doc of updated) {
    if (doc.specialty !== lastSpecialty) {
      lines.push(`    // ${doc.specialty}s`);
      lastSpecialty = doc.specialty;
    }
    lines.push(`    {`);
    lines.push(`        id: "${doc.id}",`);
    lines.push(`        name: "${doc.name}",`);
    lines.push(`        specialty: "${doc.specialty}",`);
    lines.push(`        hospital: "${doc.hospital}",`);
    lines.push(`        lat: ${doc.lat.toFixed(6)},`);
    lines.push(`        lng: ${doc.lng.toFixed(6)},`);
    lines.push(`        rating: ${doc.rating},`);
    lines.push(`        phone: "${doc.phone}",`);
    lines.push(`        address: "${doc.address}"`);
    lines.push(`    },`);
  }

  // Remove trailing comma from last entry
  lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/, '');
  lines.push(`]`);
  lines.push(``);

  console.log(lines.join('\n'));
  console.error('\n✅ Done! Pipe stdout to src/lib/data/doctors.ts to apply changes.');
}

main().catch(console.error);
