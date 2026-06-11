export interface Doctor {
    id: string
    name: string
    specialty: string
    hospital: string
    lat: number
    lng: number
    rating: number
    phone: string
    address: string
}

// Center: Kolkata (22.5726, 88.3639)
// Coordinates geocoded via Nominatim (OpenStreetMap) on 2026-06-05
// Re-run frontend/scripts/geocode_doctors.mjs to refresh after address changes.
export const doctors: Doctor[] = [
    // Cardiologists
    {
        id: "1",
        name: "Dr. Anirban Roy",
        specialty: "Cardiologist",
        hospital: "Apollo Multispecialty Hospital",
        lat: 22.564500,
        lng: 88.396500,
        rating: 4.8,
        phone: "+91 9123456789",
        address: "58, Canal Circular Rd, Kadapara, Phool Bagan, Kankurgachi, Kolkata, West Bengal 700054"
    },
    {
        id: "2",
        name: "Dr. Sutanu Ghosh",
        specialty: "Cardiologist",
        hospital: "BM Birla Heart Research Centre",
        lat: 22.532889,
        lng: 88.328283,
        rating: 4.7,
        phone: "+91 9486526499",
        address: "1/1, National Library Ave, Alipore, Kolkata, West Bengal 700027"
    },
    {
        id: "14",
        name: "Dr. Mihir Kumar Das",
        specialty: "Cardiologist",
        hospital: "Fortis Hospital, Anandapur",
        lat: 22.516500,
        lng: 88.397000,
        rating: 4.9,
        phone: "+91 9831012345",
        address: "730, Anandapur, E.M. Bypass Road, Kolkata, West Bengal 700107"
    },

    // Dermatologists
    {
        id: "3",
        name: "Dr. Rina Das",
        specialty: "Dermatologist",
        hospital: "AMRI Hospital, Dhakuria",
        lat: 22.512500,
        lng: 88.367600,
        rating: 4.5,
        phone: "+91 9414327059",
        address: "P-4, 5, Gariahat Rd, Block A, Dhakuria, Kolkata, West Bengal 700029"
    },
    {
        id: "4",
        name: "Dr. Samir Sen",
        specialty: "Dermatologist",
        hospital: "Fortis Hospital, Anandapur",
        lat: 22.516500,
        lng: 88.397000,
        rating: 4.6,
        phone: "+91 9360373426",
        address: "730, EM Bypass, Anandapur, East Kolkata Twp, Kolkata, WB 700107"
    },
    {
        id: "15",
        name: "Dr. Sachin Varma",
        specialty: "Dermatologist",
        hospital: "AMRI Hospital, Salt Lake",
        lat: 22.571400,
        lng: 88.411600,
        rating: 4.7,
        phone: "+91 9412459656",
        address: "JC-16 & 17, Sector III, Salt Lake City, Kolkata, West Bengal 700098"
    },

    // General Physicians
    {
        id: "5",
        name: "Dr. Priya Sharma",
        specialty: "General Physician",
        hospital: "Woodlands Hospital",
        lat: 22.532252,
        lng: 88.329239,
        rating: 4.3,
        phone: "+91 9141228207",
        address: "8/5, Alipore Rd, Alipore, Kolkata, WB 700027"
    },
    {
        id: "16",
        name: "Dr. Rahul Mitra",
        specialty: "General Physician",
        hospital: "Nightingale Hospital",
        lat: 22.546022,
        lng: 88.351542,
        rating: 4.4,
        phone: "+91 9935518697",
        address: "11, Shakespeare Sarani Rd, Kolkata, WB 700071"
    },
    {
        id: "17",
        name: "Dr. S.K. Gupta",
        specialty: "General Physician",
        hospital: "Ruby General Hospital",
        lat: 22.513500,
        lng: 88.403000,
        rating: 4.5,
        phone: "+91 9205967426",
        address: "576, Anandapur, E.M. Bypass, Kasba Golpark, Kolkata, West Bengal 700107"
    },

    // Neurologists
    {
        id: "6",
        name: "Dr. Amitava Banerjee",
        specialty: "Neurologist",
        hospital: "Medica Superspecialty Hospital",
        lat: 22.494200,
        lng: 88.400800,
        rating: 4.9,
        phone: "+91 9639917428",
        address: "127, Mukundapur Main Rd, Nitai Nagar, Mukundapur, Kolkata, West Bengal 700099"
    },
    {
        id: "18",
        name: "Dr. Hrishikesh Kumar",
        specialty: "Neurologist",
        hospital: "AMRI Hospital, Dhakuria",
        lat: 22.512500,
        lng: 88.367600,
        rating: 4.8,
        phone: "+91 9863996301",
        address: "P-4, 5, Gariahat Rd, Block A, Dhakuria, Kolkata, West Bengal 700029"
    },
    {
        id: "19",
        name: "Dr. V.K. Das",
        specialty: "Neurologist",
        hospital: "AMRI Hospital, Salt Lake",
        lat: 22.571400,
        lng: 88.411600,
        rating: 4.7,
        phone: "+91 9474339369",
        address: "JC-16 & 17, Salt Lake City, Sector III, Kolkata, WB 700106"
    },

    // Pediatricians
    {
        id: "7",
        name: "Dr. Tapa Jyoti",
        specialty: "Pediatrician",
        hospital: "Apollo Multispecialty Hospital",
        lat: 22.564500,
        lng: 88.396500,
        rating: 4.8,
        phone: "+91 9213052579",
        address: "58, Canal Circular Rd, Kadapara, Phool Bagan, Kankurgachi, Kolkata, West Bengal 700054"
    },
    {
        id: "20",
        name: "Dr. Apurba Ghosh",
        specialty: "Pediatrician",
        hospital: "AMRI Hospital, Salt Lake",
        lat: 22.571400,
        lng: 88.411600,
        rating: 4.9,
        phone: "+91 9044677885",
        address: "JC-16 & 17, Sector III, Salt Lake City, Kolkata, West Bengal 700098"
    },
    {
        id: "21",
        name: "Dr. Sumita Saha",
        specialty: "Pediatrician",
        hospital: "Fortis Hospital, Anandapur",
        lat: 22.516500,
        lng: 88.397000,
        rating: 4.7,
        phone: "+91 9214465980",
        address: "730, EM Bypass, Anandapur, East Kolkata Twp, Kolkata, WB 700107"
    },

    // Orthopedic
    {
        id: "8",
        name: "Dr. Kunal Sarkar",
        specialty: "Orthopedic",
        hospital: "Medica Superspecialty Hospital",
        lat: 22.494200,
        lng: 88.400800,
        rating: 4.7,
        phone: "+91 9357560801",
        address: "127, Mukundapur Main Rd, Nitai Nagar, Mukundapur, Kolkata, West Bengal 700099"
    },
    {
        id: "22",
        name: "Dr. Rajeev Sharma",
        specialty: "Orthopedic",
        hospital: "Apollo Multispecialty Hospital",
        lat: 22.564500,
        lng: 88.396500,
        rating: 4.8,
        phone: "+91 9413500310",
        address: "58, Canal Circular Rd, Kadapara, Phool Bagan, Kankurgachi, Kolkata, West Bengal 700054"
    },
    {
        id: "23",
        name: "Dr. Anindya Bose",
        specialty: "Orthopedic",
        hospital: "Peerless Hospital",
        lat: 22.481000,
        lng: 88.393800,
        rating: 4.6,
        phone: "+91 9987193202",
        address: "360, Pancha Sayyar, Kolkata, West Bengal 700094"
    },

    // Ophthalmologists
    {
        id: "9",
        name: "Dr. S. Natarajan",
        specialty: "Ophthalmologist",
        hospital: "Susrut Eye Foundation",
        lat: 22.576200,
        lng: 88.384500,
        rating: 4.6,
        phone: "+91 9258512716",
        address: "HB-36/A/1, Sector-III, Salt Lake City, Kolkata, WB 700106"
    },
    {
        id: "24",
        name: "Dr. Debasish Bhattacharya",
        specialty: "Ophthalmologist",
        hospital: "Nightingale Hospital",
        lat: 22.546022,
        lng: 88.351542,
        rating: 4.8,
        phone: "+91 9468013856",
        address: "11, Shakespeare Sarani Rd, Kolkata, WB 700071"
    },

    // Gastroenterologists
    {
        id: "10",
        name: "Dr. Mahesh Goenka",
        specialty: "Gastroenterologist",
        hospital: "Apollo Multispecialty Hospital",
        lat: 22.564500,
        lng: 88.396500,
        rating: 4.9,
        phone: "+91 9484077966",
        address: "58, Canal Circular Rd, Kadapara, Phool Bagan, Kankurgachi, Kolkata, West Bengal 700054"
    },
    {
        id: "25",
        name: "Dr. Sanjay Chowdhury",
        specialty: "Gastroenterologist",
        hospital: "CMRI (Calcutta Medical Research Institute)",
        lat: 22.524607,
        lng: 88.325204,
        rating: 4.5,
        phone: "+91 9375105073",
        address: "7/2, Diamond Harbour Rd, Alipore, Kolkata, WB 700027"
    },

    // Dentists
    {
        id: "11",
        name: "Dr. Rajiv Khanna",
        specialty: "Dentist",
        hospital: "Kothari Medical Centre",
        lat: 22.532735,
        lng: 88.330549,
        rating: 4.5,
        phone: "+91 9019104733",
        address: "8/3, Alipore Rd, Kolkata, West Bengal 700027"
    },
    {
        id: "26",
        name: "Dr. Anjali Agarwal",
        specialty: "Dentist",
        hospital: "Belle Vue Clinic",
        lat: 22.544980,
        lng: 88.356655,
        rating: 4.7,
        phone: "+91 9044803552",
        address: "9, Loudon St, Kolkata, WB 700017"
    },

    // Psychiatrists
    {
        id: "12",
        name: "Dr. Jai Ranjan Ram",
        specialty: "Psychiatrist",
        hospital: "Belle Vue Clinic",
        lat: 22.544980,
        lng: 88.356655,
        rating: 4.8,
        phone: "+91 9148654003",
        address: "9, Loudon St, Kolkata, WB 700017"
    },
    {
        id: "27",
        name: "Dr. S. Nandi",
        specialty: "Psychiatrist",
        hospital: "Peerless Hospital",
        lat: 22.481000,
        lng: 88.393800,
        rating: 4.6,
        phone: "+91 9497050680",
        address: "360, Pancha Sayyar, Kolkata, West Bengal 700094"
    },

    // ENT Specialists
    {
        id: "13",
        name: "Dr. Arjun Das",
        specialty: "ENT Specialist",
        hospital: "AMRI Hospital, Dhakuria",
        lat: 22.512500,
        lng: 88.367600,
        rating: 4.6,
        phone: "+91 9988117890",
        address: "P-4, 5, Gariahat Rd, Block A, Dhakuria, Kolkata, West Bengal 700029"
    },
    {
        id: "28",
        name: "Dr. Dulal Basu",
        specialty: "ENT Specialist",
        hospital: "ILS Hospital, Salt Lake",
        lat: 22.585500,
        lng: 88.413700,
        rating: 4.5,
        phone: "+91 9259286374",
        address: "DD-6, Sector 1, Salt Lake City, Kolkata, West Bengal 700064"
    },
    {
        id: "33",
        name: "Dr. Shantanu Panja",
        specialty: "ENT Specialist",
        hospital: "Apollo Multispeciality Hospitals",
        lat: 22.574600,
        lng: 88.401900,
        rating: 4.8,
        phone: "+91 33 2320 3040",
        address: "58, Canal Circular Rd, Kadapara, Phool Bagan, Kankurgachi, Kolkata, West Bengal 700054"
    },
    {
        id: "34",
        name: "Dr. Abhik Ghosh",
        specialty: "ENT Specialist",
        hospital: "Apollo Multispeciality Hospitals",
        lat: 22.574600,
        lng: 88.401900,
        rating: 4.7,
        phone: "+91 33 2320 3040",
        address: "58, Canal Circular Rd, Kadapara, Phool Bagan, Kankurgachi, Kolkata, West Bengal 700054"
    },

    // Sleep Specialists
    {
        id: "29",
        name: "Dr. Himadri Roy",
        specialty: "Sleep Specialist",
        hospital: "AMRI Hospital, Dhakuria",
        lat: 22.512500,
        lng: 88.367600,
        rating: 4.7,
        phone: "+91 9101200062",
        address: "P-4, 5, Gariahat Rd, Block A, Dhakuria, Kolkata, West Bengal 700029"
    },
    {
        id: "30",
        name: "Dr. S. Mukherjee",
        specialty: "Sleep Specialist",
        hospital: "Belle Vue Clinic",
        lat: 22.544980,
        lng: 88.356655,
        rating: 4.8,
        phone: "+91 9435323143",
        address: "9, Loudon St, Kolkata, WB 700017"
    },

    // Hepatologists
    {
        id: "31",
        name: "Dr. Amitabha Chowdhury",
        specialty: "Hepatologist",
        hospital: "Medica Superspecialty Hospital",
        lat: 22.494200,
        lng: 88.400800,
        rating: 4.9,
        phone: "+91 9978550617",
        address: "127, Mukundapur Main Rd, Nitai Nagar, Mukundapur, Kolkata, West Bengal 700099"
    },
    {
        id: "32",
        name: "Dr. Abhijit Das",
        specialty: "Hepatologist",
        hospital: "IPGMER & SSKM Hospital",
        lat: 22.539000,
        lng: 88.340900,
        rating: 4.6,
        phone: "+91 9132236087",
        address: "244, AJC Bose Rd, Alipore, Kolkata, WB 700020"
    },

    // Infectious Disease Specialists
    {
        id: "35",
        name: "Dr. Bhaskar Narayan Chaudhuri",
        specialty: "Infectious Disease Specialist",
        hospital: "School of Tropical Medicine",
        lat: 22.539000,
        lng: 88.351300,
        rating: 4.9,
        phone: "+91 9831112233",
        address: "108, Chittaranjan Ave, Shyambazar, Kolkata, West Bengal 700073"
    },
    {
        id: "36",
        name: "Dr. Koel Bhattacharyya",
        specialty: "Infectious Disease Specialist",
        hospital: "Medica Superspecialty Hospital",
        lat: 22.494200,
        lng: 88.400800,
        rating: 4.7,
        phone: "+91 9874223311",
        address: "127, Mukundapur Main Rd, Nitai Nagar, Mukundapur, Kolkata, West Bengal 700099"
    },
    {
        id: "37",
        name: "Dr. Supriyo Chakravarti",
        specialty: "Infectious Disease Specialist",
        hospital: "AMRI Hospital, Salt Lake",
        lat: 22.571400,
        lng: 88.411600,
        rating: 4.8,
        phone: "+91 9433114455",
        address: "JC-16 & 17, Sector III, Salt Lake City, Kolkata, West Bengal 700098"
    },

    // Pulmonologists
    {
        id: "38",
        name: "Dr. Saibal Moitra",
        specialty: "Pulmonologist",
        hospital: "Apollo Multispecialty Hospital",
        lat: 22.564500,
        lng: 88.396500,
        rating: 4.8,
        phone: "+91 9831098765",
        address: "58, Canal Circular Rd, Kadapara, Phool Bagan, Kankurgachi, Kolkata, West Bengal 700054"
    },
    {
        id: "39",
        name: "Dr. Parthasarathi Bhattacharyya",
        specialty: "Pulmonologist",
        hospital: "Peerless Hospital",
        lat: 22.481000,
        lng: 88.393800,
        rating: 4.7,
        phone: "+91 9748233445",
        address: "360, Pancha Sayyar, Kolkata, West Bengal 700094"
    },

    // Endocrinologists
    {
        id: "40",
        name: "Dr. Pradip Mukhopadhyay",
        specialty: "Endocrinologist",
        hospital: "AMRI Hospital, Dhakuria",
        lat: 22.512500,
        lng: 88.367600,
        rating: 4.9,
        phone: "+91 9831556677",
        address: "P-4, 5, Gariahat Rd, Block A, Dhakuria, Kolkata, West Bengal 700029"
    },
    {
        id: "41",
        name: "Dr. Rana Bhattacharjee",
        specialty: "Endocrinologist",
        hospital: "Ruby General Hospital",
        lat: 22.513500,
        lng: 88.403000,
        rating: 4.6,
        phone: "+91 9674556677",
        address: "576, Anandapur, E.M. Bypass, Kasba Golpark, Kolkata, West Bengal 700107"
    },

    // Rheumatologists
    {
        id: "42",
        name: "Dr. Alakendu Ghosh",
        specialty: "Rheumatologist",
        hospital: "IPGMER & SSKM Hospital",
        lat: 22.539000,
        lng: 88.340900,
        rating: 4.8,
        phone: "+91 9830778899",
        address: "244, AJC Bose Rd, Alipore, Kolkata, WB 700020"
    },
    {
        id: "43",
        name: "Dr. Sumantro Mondal",
        specialty: "Rheumatologist",
        hospital: "Fortis Hospital, Anandapur",
        lat: 22.516500,
        lng: 88.397000,
        rating: 4.7,
        phone: "+91 9831445566",
        address: "730, Anandapur, E.M. Bypass Road, Kolkata, West Bengal 700107"
    },

    // Allergists
    {
        id: "44",
        name: "Dr. Sukanta Bhattacharyya",
        specialty: "Allergist",
        hospital: "Kothari Medical Centre",
        lat: 22.532735,
        lng: 88.330549,
        rating: 4.6,
        phone: "+91 9830334455",
        address: "8/3, Alipore Rd, Kolkata, West Bengal 700027"
    },
    {
        id: "45",
        name: "Dr. Prasanta Bhattacharyya",
        specialty: "Allergist",
        hospital: "Medica Superspecialty Hospital",
        lat: 22.494200,
        lng: 88.400800,
        rating: 4.7,
        phone: "+91 9748112233",
        address: "127, Mukundapur Main Rd, Nitai Nagar, Mukundapur, Kolkata, West Bengal 700099"
    },

    // Urologists
    {
        id: "46",
        name: "Dr. Nirmalya Roy Choudhury",
        specialty: "Urologist",
        hospital: "Apollo Multispecialty Hospital",
        lat: 22.564500,
        lng: 88.396500,
        rating: 4.8,
        phone: "+91 9831667788",
        address: "58, Canal Circular Rd, Kadapara, Phool Bagan, Kankurgachi, Kolkata, West Bengal 700054"
    },
    {
        id: "47",
        name: "Dr. Arup Kumar Majumdar",
        specialty: "Urologist",
        hospital: "Woodlands Hospital",
        lat: 22.532252,
        lng: 88.329239,
        rating: 4.7,
        phone: "+91 9748556677",
        address: "8/5, Alipore Rd, Alipore, Kolkata, WB 700027"
    },

    // Vascular Surgeons
    {
        id: "48",
        name: "Dr. Pradipta Roy Chowdhury",
        specialty: "Vascular Surgeon",
        hospital: "Belle Vue Clinic",
        lat: 22.544980,
        lng: 88.356655,
        rating: 4.8,
        phone: "+91 9831223344",
        address: "9, Loudon St, Kolkata, WB 700017"
    },
    {
        id: "49",
        name: "Dr. Swapan Chatterjee",
        specialty: "Vascular Surgeon",
        hospital: "Peerless Hospital",
        lat: 22.481000,
        lng: 88.393800,
        rating: 4.6,
        phone: "+91 9748334455",
        address: "360, Pancha Sayyar, Kolkata, West Bengal 700094"
    }
]
