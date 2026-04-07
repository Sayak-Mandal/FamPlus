
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Doctor } from '@prisma/client';
import L from 'leaflet';

// Fix for default marker icon in leaflet with webpack
// See https://github.com/PaulLeCam/react-leaflet/issues/453
const icon = L.icon({
    iconUrl: "/images/marker-icon.png",
    iconRetinaUrl: "/images/marker-icon-2x.png",
    shadowUrl: "/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41]
});

// Since we might not have local images, let's use CDN for marker icons if needed 
// or let Leaflet try its default.
// Often in Next.js, we need to manually set the icon defaults.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface DoctorMapProps {
    doctors: Doctor[];
    initialCenter?: [number, number];
}

export default function DoctorMap({ doctors, initialCenter = [40.7128, -74.0060] }: DoctorMapProps) {
    return (
        <MapContainer
            center={initialCenter}
            zoom={13}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {doctors.map((doctor) => (
                <Marker key={doctor.id} position={[doctor.lat, doctor.lng]}>
                    <Popup>
                        <div className="font-semibold">{doctor.name}</div>
                        <div className="text-sm text-gray-600">{doctor.specialty}</div>
                        <div className="text-xs text-gray-500 mt-1">{doctor.address}</div>
                        <div className="text-xs text-blue-500 mt-1">{doctor.phone}</div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
