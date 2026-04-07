
import { Card, CardContent } from "@/components/ui/card"
// Keep MapMarker type import if possible, or move it. 
// Actually, MapMarker is exported from the file. We can import the type safely.
import { MapMarker } from "@/components/map-component"
import { MapPin, Search, Stethoscope, Loader2, Phone } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"

import { analyzeSymptomsAndFindDoctors } from "@/app/actions/health"
import { Doctor, doctors } from "@/lib/data/doctors"
import { lazy, Suspense } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// Dynamically import MapComponent using React.lazy with Vite-compatible syntax
const MapComponent = lazy(() => import("@/components/map-component").then((mod) => ({ default: mod.MapComponent })))

function FindCareContent() {
    const [searchParams] = useSearchParams()
    const initialSymptoms = searchParams.get("symptoms") || ""

    const [symptoms, setSymptoms] = useState(initialSymptoms)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{
        analysis: string
        specialty: string
        doctors: Doctor[]
    } | null>(null)

    const [mapCenter, setMapCenter] = useState<{ lat: number, lng: number }>({ lat: 22.5726, lng: 88.3639 })
    const [mapZoom, setMapZoom] = useState(13)

    const [selectedCategory, setSelectedCategory] = useState<string>("all")

    // Get unique specialties
    const specialties = Array.from(new Set(doctors.map(d => d.specialty))).sort()

    // Auto-search on load if symptoms exist
    useEffect(() => {
        if (initialSymptoms) {
            handleSearch(initialSymptoms)
        } else {
            // Initial load - show all or none? Let's show all for exploration
            handleCategoryChange("all")
        }
    }, [initialSymptoms])

    const handleSearch = async (query: string = symptoms) => {
        if (!query.trim()) return
        setLoading(true)
        setSelectedCategory("all") // Reset category on text search

        try {
            const data = await analyzeSymptomsAndFindDoctors(query)
            setResult(data)
        } catch (error) {
            console.error("Failed to analyze symptoms", error)
        } finally {
            setLoading(false)
        }
    }

    const handleCategoryChange = (category: string) => {
        setSelectedCategory(category)
        setSymptoms("") // Clear symptoms on category select

        if (category === "all") {
            setResult({
                analysis: "Showing all available specialists nearby.",
                specialty: "All Specialists",
                doctors: doctors
            })
            return
        }

        const filtered = doctors.filter(d => d.specialty === category)
        setResult({
            analysis: `Showing all ${category}s nearby.`,
            specialty: category,
            doctors: filtered
        })
    }

    const handleDoctorClick = (doctor: Doctor) => {
        setMapCenter({ lat: doctor.lat, lng: doctor.lng })
        setMapZoom(15) // Zoom in closer
    }

    const markers: MapMarker[] = result?.doctors.map(doc => ({
        lat: doc.lat,
        lng: doc.lng,
        title: doc.name,
        description: `${doc.specialty} • ${doc.hospital} • ⭐ ${doc.rating}`
    })) || []

    return (
        <div className="space-y-4 h-[calc(100vh-9rem)] flex flex-col overflow-hidden">
            <div className="flex flex-col gap-1 shrink-0">
                <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <MapPin className="h-6 w-6 text-primary" />
                    Find Care Nearby
                </h2>
                <p className="text-sm text-muted-foreground">Locate top-rated hospitals and specialists near you.</p>
            </div>

            {/* Search Bar & Filters */}
            <Card className="bg-card border shadow-sm shrink-0 relative z-20 overflow-visible">
                <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Describe symptoms (e.g., headache)..."
                            className="pl-9 bg-background"
                            value={symptoms}
                            onChange={(e) => setSymptoms(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        />
                    </div>

                    <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                        <SelectTrigger className="w-full md:w-[200px]">
                            <SelectValue placeholder="Select Specialty" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]" style={{ zIndex: 100001 }}>
                            <SelectItem value="all">All Specialties</SelectItem>
                            {specialties.map(specialty => (
                                <SelectItem key={specialty} value={specialty}>
                                    {specialty}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button onClick={() => handleSearch()} disabled={loading} className="w-full md:w-auto">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                        Find
                    </Button>
                </CardContent>
            </Card>

            {/* AI Analysis Result */}
            {result && (
                <div className="shrink-0 bg-primary/10 border border-primary/20 rounded-xl p-4 flex gap-3 text-sm animate-in fade-in slide-in-from-top-2">
                    <div className="bg-primary/20 p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                        <Stethoscope className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <p className="font-bold text-primary">Recommendation: {result.specialty}</p>
                        <p className="text-foreground/80">{result.analysis}</p>
                    </div>
                </div>
            )}

            {/* Main Content Area: Grid for List + Map */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 pb-1">

                {/* Doctor List Panel */}
                <Card className="col-span-1 border shadow-sm bg-card rounded-xl overflow-hidden flex flex-col h-full">
                    <div className="p-3 border-b font-semibold text-base flex items-center justify-between bg-muted/30 shrink-0">
                        <span>Doctors Nearby</span>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                            {result?.doctors.length || 0} Found
                        </span>
                    </div>
                    <CardContent className="p-0 overflow-y-auto flex-1 custom-scrollbar">
                        {!result ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
                                <Search className="h-12 w-12 mb-4 opacity-20" />
                                <p>Describe your symptoms to find recommended specialists.</p>
                            </div>
                        ) : result.doctors.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                No doctors found for this criteria.
                            </div>
                        ) : (
                            <div className="divide-y">
                                {result.doctors.map((doctor) => (
                                    <div
                                        key={doctor.id}
                                        onClick={() => {
                                            handleDoctorClick(doctor)
                                            // Scroll to map on mobile/small screens
                                            const mapElement = document.getElementById('map-section')
                                            if (mapElement) {
                                                mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                            }
                                        }}
                                        className="w-full text-left p-4 hover:bg-muted/50 transition-colors flex flex-col gap-1 group cursor-pointer relative"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="relative group/name inline-block">
                                                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                                    {doctor.name}
                                                </h3>
                                                {doctor.address && (
                                                    <div className="absolute left-0 top-full mt-1 hidden group-hover/name:block w-max max-w-[250px] bg-popover text-popover-foreground text-xs p-2 rounded-lg shadow-xl border border-border z-50 pointer-events-none">
                                                        <span className="font-bold block mb-1">Address</span>
                                                        {doctor.address}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center text-xs font-medium text-amber-500">
                                                ⭐ {doctor.rating}
                                            </div>
                                        </div>
                                        <p className="text-xs text-primary font-medium">{doctor.specialty}</p>
                                        <div className="text-xs text-muted-foreground flex flex-col gap-1 mt-1 truncate">
                                            <span className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3 shrink-0" />
                                                {doctor.hospital}
                                            </span>
                                            {doctor.phone && (
                                                <span 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(doctor.phone || '');
                                                    }}
                                                    className="flex items-center gap-1 font-mono tracking-tight bg-muted/40 hover:bg-muted/80 p-1 px-1.5 rounded-md w-fit transition-colors mt-0.5"
                                                    title="Click to copy phone number"
                                                >
                                                    <Phone className="h-3 w-3 shrink-0" />
                                                    {doctor.phone}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Map Panel */}
                <Card id="map-section" className="col-span-1 lg:col-span-2 overflow-hidden border shadow-sm bg-card rounded-xl relative h-full z-0">
                    <CardContent className="p-0 h-full w-full relative">
                        <MapComponent
                            markers={markers}
                            center={mapCenter}
                            zoom={mapZoom}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default function FindCarePage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>}>
            <FindCareContent />
        </Suspense>
    )
}
