import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { MapPin } from "lucide-react"

// Fix for default marker icon not showing up in React Leaflet
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
})

const containerStyle = {
    width: "100%",
    height: "100%",
    borderRadius: "0.75rem",
}

// Default center (Kolkata, India) as fallback
// Center: Kolkata (22.5726, 88.3639)
const defaultCenter = {
    lat: 22.5726,
    lng: 88.3639,
}

export interface MapMarker {
    lat: number
    lng: number
    title: string
    description?: string
}

interface MapComponentProps {
    markers?: MapMarker[]
    center?: { lat: number; lng: number }
    zoom?: number
}

// Component to handle map view updates
function MapController({ center, zoom }: { center: { lat: number; lng: number }, zoom: number }) {
    const map = useMap()
    useEffect(() => {
        map.flyTo([center.lat, center.lng], zoom, {
            duration: 1.5
        })
    }, [center, zoom, map])
    return null
}

export function MapComponent({ markers = [], center = defaultCenter, zoom = 13 }: MapComponentProps) {
    // Leaflet needs to run only on client side
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted) {
        return (
            <div className="w-full h-full bg-muted animate-pulse rounded-xl flex items-center justify-center">
                <MapPin className="h-10 w-10 text-muted-foreground opacity-50" />
            </div>
        )
    }

    return (
        <MapContainer
            center={[center.lat, center.lng]}
            zoom={zoom}
            style={containerStyle}
            scrollWheelZoom={false}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapController center={center} zoom={zoom} />

            {/* User Location (Static for now) */}
            <Marker position={[defaultCenter.lat, defaultCenter.lng]}>
                <Popup>
                    You are here (Kolkata)
                </Popup>
            </Marker>

            {/* Dynamic Markers */}
            {markers.map((marker, index) => (
                <Marker key={index} position={[marker.lat, marker.lng]}>
                    <Popup>
                        <strong>{marker.title}</strong>
                        {marker.description && <><br />{marker.description}</>}
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    )
}
