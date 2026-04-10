import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { MapPin, Copy, Check } from "lucide-react"

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
    address?: string
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
    const [isMounted, setIsMounted] = useState(false)
    const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const handleCopy = (address: string, id: string) => {
        navigator.clipboard.writeText(address)
        setCopiedAddress(id)
        setTimeout(() => setCopiedAddress(null), 2000)
    }

    if (!isMounted) {
        return (
            <div className="w-full h-full bg-muted animate-pulse rounded-xl flex items-center justify-center">
                <MapPin className="h-10 w-10 text-muted-foreground opacity-50" />
            </div>
        )
    }

    return (
        <MapContainer
            // @ts-ignore
            center={[center.lat, center.lng]}
            // @ts-ignore
            zoom={zoom}
            style={containerStyle}
            // @ts-ignore
            scrollWheelZoom={false}
        >
            <TileLayer
                // @ts-ignore
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapController center={center} zoom={zoom} />

            {/* Dynamic Markers */}
            {markers.map((marker, index) => (
                <Marker key={index} position={[marker.lat, marker.lng]}>
                    <Popup 
                        // @ts-ignore
                        className="doctor-popup"
                    >
                        <div className="flex flex-col gap-2 min-w-[200px] p-1">
                            <div>
                                <h4 className="font-bold text-base text-primary m-0">{marker.title}</h4>
                                {marker.description && (
                                    <p className="text-xs text-muted-foreground mt-1 mb-0 leading-tight">
                                        {marker.description}
                                    </p>
                                )}
                            </div>
                            
                            {marker.address && (
                                <div className="mt-2 pt-2 border-t border-border flex flex-col gap-1.5">
                                    <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Address</span>
                                    <div className="flex items-start justify-between gap-2 bg-muted/50 p-2 rounded-lg group">
                                        <p className="text-xs font-medium text-foreground leading-normal m-0 flex-1">
                                            {marker.address}
                                        </p>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleCopy(marker.address!, `marker-${index}`)
                                            }}
                                            className="shrink-0 p-1.5 hover:bg-background rounded-md transition-all text-muted-foreground hover:text-primary border border-transparent hover:border-border"
                                            title="Copy address"
                                        >
                                            {copiedAddress === `marker-${index}` ? (
                                                <Check className="h-3.5 w-3.5 text-green-500" />
                                            ) : (
                                                <Copy className="h-3.5 w-3.5" />
                                            )}
                                        </button>
                                    </div>
                                    {copiedAddress === `marker-${index}` && (
                                        <span className="text-[10px] text-green-500 font-medium animate-in fade-in slide-in-from-top-1">
                                            Address copied to clipboard!
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Get Directions Button */}
                            <button
                                onClick={() => {
                                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${marker.lat},${marker.lng}`, '_blank')
                                }}
                                className="mt-1 w-full flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary py-2 rounded-lg text-xs font-semibold transition-colors"
                            >
                                <MapPin className="h-3 w-3" />
                                Get Directions
                            </button>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    )
}
