
import { Card, CardContent } from "@/components/ui/card"
import { MapMarker } from "@/components/map-component"
import { MapPin, Search, Stethoscope, Loader2, Phone, Copy, AlertTriangle, Mic, MicOff } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useLocation } from "react-router-dom"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"

import { predictSpecialty } from "@/app/actions/health"
import { Doctor, doctors as ALL_DOCTORS } from "@/lib/data/doctors"
import { lazy, Suspense } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Dynamically import MapComponent using React.lazy with Vite-compatible syntax
const MapComponent = lazy(() => import("@/components/map-component").then((mod) => ({ default: mod.MapComponent })))

/**
 * Maps specialist names returned by the AI engine to the exact specialty strings
 * used in the local doctors.ts database, with a priority-ordered list of fallbacks.
 *
 * For example, the AI might return "Pulmonologist" but the local list only has
 * "General Physician" — in that case we show General Physicians rather than 0 results.
 */
const SPECIALIST_MATCH_MAP: Record<string, string[]> = {
    // Exact matches first, then broader fallbacks
    'Cardiologist':                    ['Cardiologist'],
    'Neurologist':                     ['Neurologist'],
    'Dermatologist':                   ['Dermatologist'],
    'General Physician':               ['General Physician'],
    'Pediatrician':                    ['Pediatrician'],
    'Orthopedic':                      ['Orthopedic'],
    'Ophthalmologist':                 ['Ophthalmologist'],
    'Gastroenterologist':              ['Gastroenterologist'],
    'Dentist':                         ['Dentist'],
    'Psychiatrist':                    ['Psychiatrist'],
    'ENT Specialist':                  ['ENT Specialist'],
    'Sleep Specialist':                ['Sleep Specialist'],
    'Hepatologist':                    ['Hepatologist'],
    // Specialists now in local list → resolve directly
    'Pulmonologist':                   ['Pulmonologist', 'General Physician'],
    'Rheumatologist':                  ['Rheumatologist', 'Orthopedic', 'General Physician'],
    'Endocrinologist':                 ['Endocrinologist', 'General Physician'],
    'Allergist':                       ['Allergist', 'General Physician'],
    'Infectious Disease Specialist':   ['Infectious Disease Specialist', 'General Physician'],
    'Urologist':                       ['Urologist', 'General Physician'],
    'Vascular Surgeon':                ['Vascular Surgeon', 'General Physician'],
    'Emergency Physician / Toxicology': ['General Physician'],
    'Professional Exorcist':           [],  // handled as easter egg
}

/**
 * Finds the best-matching doctors from the local static list for a given specialist name.
 * First tries an exact match, then tries the fallback chain in SPECIALIST_MATCH_MAP,
 * and finally falls back to all General Physicians if nothing else matches.
 */
function findLocalDoctors(specialist: string): { doctors: Doctor[]; resolvedSpecialty: string } {
    const normalized = specialist.trim()

    // ── Easter Egg: Ghost of Park Street ─────────────────────────────────────
    if (normalized === 'Professional Exorcist') {
        return {
            resolvedSpecialty: 'Professional Exorcist',
            doctors: [{
                id: 'ghost-1',
                name: 'The Ghost of Park Street',
                specialty: 'Professional Exorcist',
                hospital: 'South Park Street Cemetery',
                address: '52, Park St, Mullick Bazar, Park Street area, Kolkata, West Bengal 700017',
                rating: 4.9,
                lat: 22.5462025,
                lng: 88.3602216,
                phone: 'BOO-GHOST-BUSTERS'
            }]
        }
    }

    // 1. Try exact match first
    const exact = ALL_DOCTORS.filter(d => d.specialty.toLowerCase() === normalized.toLowerCase())
    if (exact.length > 0) return { doctors: exact, resolvedSpecialty: normalized }

    // 2. Try the fallback chain from SPECIALIST_MATCH_MAP
    const chain = SPECIALIST_MATCH_MAP[normalized] ?? []
    for (const fallback of chain) {
        const fallbackDocs = ALL_DOCTORS.filter(d => d.specialty.toLowerCase() === fallback.toLowerCase())
        if (fallbackDocs.length > 0) return { doctors: fallbackDocs, resolvedSpecialty: fallback }
    }

    // 3. Partial match — the AI may sometimes return e.g. "Cardiac Surgeon" or "Heart Specialist"
    const partial = ALL_DOCTORS.filter(d =>
        d.specialty.toLowerCase().includes(normalized.toLowerCase()) ||
        normalized.toLowerCase().includes(d.specialty.toLowerCase())
    )
    if (partial.length > 0) return { doctors: partial, resolvedSpecialty: partial[0].specialty }

    // 4. Ultimate fallback — show General Physicians so the list is never empty
    const gp = ALL_DOCTORS.filter(d => d.specialty === 'General Physician')
    return { doctors: gp, resolvedSpecialty: 'General Physician' }
}

function FindCareContent() {
    const [searchParams] = useSearchParams()
    const location = useLocation()
    const initialSymptoms = searchParams.get("symptoms") || ""
    const { isListening, toggleListening, stopListening, isSupported, interimTranscript } = useSpeechRecognition()

    // aiResult is passed from SymptomChecker via router state — it already has the
    // correct specialist so we should use it directly, not re-call the AI.
    const { aiResult } = location.state || {}

    const [symptoms, setSymptoms] = useState(initialSymptoms)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{
        analysis: string
        specialty: string
        resolvedSpecialty: string
        doctors: Doctor[]
        urgency?: string
    } | null>(null)

    const [copiedId, setCopiedId] = useState<string | null>(null)

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const [mapCenter, setMapCenter] = useState<{ lat: number, lng: number }>({ lat: 22.5726, lng: 88.3639 })
    const [mapZoom, setMapZoom] = useState(13)

    const [selectedCategory, setSelectedCategory] = useState<string>("all")

    // Get unique specialties from the local static list
    const specialties = Array.from(new Set(ALL_DOCTORS.map(d => d.specialty))).sort()

    /**
     * Core search handler.
     * Priority:
     *   1. If a specialist is explicitly provided (from aiResult), use it → local filter
     *   2. Otherwise call the AI engine directly → local filter
     */
    const handleSearch = useCallback(async (
        query: string = symptoms,
        explicitSpecialist?: string,
        explicitAnalysis?: string,
        explicitUrgency?: string,
    ) => {
        if (!query.trim() && !explicitSpecialist) return
        setLoading(true)
        setSelectedCategory("all")

        try {
            let specialist = explicitSpecialist || ''
            let analysis = explicitAnalysis || ''
            let urgency = explicitUrgency || 'Normal'

            if (!specialist) {
                // No pre-computed specialist → call AI engine directly
                console.log('[FindCare] No cached specialist — calling AI engine directly...')
                const prediction = await predictSpecialty(query)
                specialist = prediction.specialist
                analysis = prediction.analysis
                urgency = prediction.urgency
            } else {
                console.log(`[FindCare] Using cached specialist from aiResult: ${specialist}`)
            }

            // Always resolve doctors locally — never use MongoDB (it's empty for doctors)
            const { doctors, resolvedSpecialty } = findLocalDoctors(specialist)

            console.log(`[FindCare] specialist="${specialist}" → resolvedSpecialty="${resolvedSpecialty}" → ${doctors.length} doctors found`)

            setResult({
                analysis,
                specialty: specialist,
                resolvedSpecialty,
                doctors,
                urgency,
            })

            // Auto-center map on first doctor
            if (doctors.length > 0) {
                setMapCenter({ lat: doctors[0].lat, lng: doctors[0].lng })
                setMapZoom(13)
            }
        } catch (error) {
            console.error("FindCare search error:", error)
        } finally {
            setLoading(false)
        }
    }, [symptoms])

    // Auto-search on mount — use the aiResult from router state if available
    useEffect(() => {
        if (initialSymptoms) {
            if (aiResult?.specialist) {
                // Fast path: AI already ran in SymptomChecker, just filter locally
                handleSearch(
                    initialSymptoms,
                    aiResult.specialist,
                    `${aiResult.condition} — ${aiResult.advice}`,
                    aiResult.urgency,
                )
            } else {
                // No cached result — call AI engine
                handleSearch(initialSymptoms)
            }
        } else {
            // No symptoms query — show all doctors for exploration
            handleCategoryChange("all")
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleCategoryChange = (category: string) => {
        setSelectedCategory(category)
        setSymptoms("")

        if (category === "all") {
            setResult({
                analysis: "Showing all available specialists nearby.",
                specialty: "All Specialists",
                resolvedSpecialty: "All Specialists",
                doctors: ALL_DOCTORS,
            })
            return
        }

        const filtered = ALL_DOCTORS.filter(d => d.specialty === category)
        setResult({
            analysis: `Showing all ${category}s nearby.`,
            specialty: category,
            resolvedSpecialty: category,
            doctors: filtered,
        })
    }

    const handleDoctorClick = (doctor: Doctor) => {
        setMapCenter({ lat: doctor.lat, lng: doctor.lng })
        setMapZoom(15)
    }

    const markers: MapMarker[] = result?.doctors.map(doc => ({
        lat: doc.lat,
        lng: doc.lng,
        title: doc.name,
        description: `${doc.specialty}${doc.hospital ? ` • ${doc.hospital}` : ''}${doc.rating ? ` • ⭐ ${doc.rating}` : ''}`,
        address: doc.address
    })) || []

    const isEmergency = result?.urgency === 'Emergency' || result?.urgency === 'High'

    return (
        <div className="space-y-4 h-[calc(100vh-9rem)] flex flex-col overflow-hidden">
            <div className="flex flex-col gap-1 shrink-0">
                <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <MapPin className="h-6 w-6 text-primary" />
                    Find Care Nearby
                </h2>
                <p className="text-sm text-muted-foreground">Locate top-rated hospitals and specialists near you.</p>
            </div>

            {/* Emergency Banner */}
            {isEmergency && (
                <div className="shrink-0 bg-red-500/10 border border-red-500/40 rounded-xl p-3 flex gap-3 items-center animate-in fade-in slide-in-from-top-2">
                    <div className="bg-red-500 p-2 rounded-full animate-pulse shrink-0">
                        <AlertTriangle className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-red-600 dark:text-red-400 text-sm">Emergency Situation Detected</p>
                        <p className="text-xs text-red-600/80 dark:text-red-400/80">
                            Seek emergency care immediately. Call 112 or go to the nearest hospital.
                        </p>
                    </div>
                </div>
            )}

            {/* Search Bar & Filters */}
            <Card className="bg-card border shadow-sm shrink-0 relative z-20 overflow-visible">
                <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Describe symptoms (e.g., headache)..."
                            className="pl-9 pr-12 bg-background"
                            value={symptoms}
                            onChange={(e) => setSymptoms(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        />
                        {/* WhatsApp-style Speech Recognition Overlay */}
                        {isListening && (
                            <div className="absolute inset-0.5 bg-background/95 backdrop-blur-md rounded-xl flex items-center justify-between px-4 animate-in fade-in slide-in-from-left-2 duration-300 z-10 border border-red-500/20">
                                <div className="flex items-center gap-2 w-full max-w-[70%] overflow-hidden">
                                    <div className="flex items-center justify-center w-4 h-4 relative shrink-0">
                                        <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                                    </div>
                                    <span className="text-red-600 dark:text-red-400 text-xs font-semibold tracking-wide animate-pulse shrink-0">
                                        Listening...
                                    </span>
                                    
                                    {/* Bouncing Audio Wave Visual */}
                                    <div className="flex items-end gap-0.5 h-4 px-1 shrink-0">
                                        <div className="w-0.75 h-2 bg-red-500 rounded-full origin-bottom animate-wave-1" />
                                        <div className="w-0.75 h-3.5 bg-red-500 rounded-full origin-bottom animate-wave-2" />
                                        <div className="w-0.75 h-3 bg-red-500 rounded-full origin-bottom animate-wave-3" />
                                        <div className="w-0.75 h-1.5 bg-red-500 rounded-full origin-bottom animate-wave-4" />
                                    </div>

                                    {/* Live Text Preview */}
                                    {interimTranscript && (
                                        <div className="ml-1 pl-2 border-l border-red-500/30 truncate text-xs font-medium text-foreground/80 flex-1">
                                            {interimTranscript}
                                        </div>
                                    )}
                                </div>
                                
                                <button
                                    type="button"
                                    onClick={stopListening}
                                    className="text-muted-foreground hover:text-foreground text-xs font-bold transition-all px-2.5 py-1 hover:bg-muted rounded-lg mr-8"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}

                        {isSupported && (
                            <button
                                type="button"
                                onClick={() => toggleListening((text) => setSymptoms(prev => prev ? `${prev.trim()} ${text}` : text))}
                                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all duration-300 z-20 ${
                                    isListening 
                                        ? 'bg-red-500/10 text-red-500 animate-pulse border border-red-500/30' 
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                }`}
                                title={isListening ? "Stop listening" : "Add symptoms using voice"}
                                aria-label={isListening ? "Stop voice input" : "Start voice input"}
                            >
                                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                            </button>
                        )}
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
                <div className={`shrink-0 border rounded-xl p-4 flex gap-3 text-sm animate-in fade-in slide-in-from-top-2 ${
                    isEmergency
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-primary/10 border-primary/20'
                }`}>
                    <div className={`p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0 ${
                        isEmergency ? 'bg-red-500/20' : 'bg-primary/20'
                    }`}>
                        <Stethoscope className={`h-4 w-4 ${isEmergency ? 'text-red-500' : 'text-primary'}`} />
                    </div>
                    <div>
                        <p className={`font-bold ${isEmergency ? 'text-red-600 dark:text-red-400' : 'text-primary'}`}>
                            Recommendation: {result.specialty}
                            {result.resolvedSpecialty !== result.specialty && (
                                <span className="text-xs font-normal text-muted-foreground ml-2">
                                    (showing {result.resolvedSpecialty}s near you)
                                </span>
                            )}
                        </p>
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
                        <span className={`text-xs px-2 py-1 rounded-full ${
                            (result?.doctors.length ?? 0) > 0
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground'
                        }`}>
                            {result?.doctors.length || 0} Found
                        </span>
                    </div>
                    <CardContent className="p-0 overflow-y-auto flex-1 custom-scrollbar">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
                                <Loader2 className="h-12 w-12 mb-4 animate-spin opacity-50" />
                                <p>Analyzing your symptoms... This may take a moment.</p>
                            </div>
                        ) : !result ? (
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
                                        <div className="text-xs text-muted-foreground flex flex-col gap-1 mt-1">
                                            {doctor.hospital && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3 shrink-0" />
                                                    {doctor.hospital}
                                                </span>
                                            )}
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {doctor.phone && (
                                                    <span
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCopy(doctor.phone, `phone-${doctor.id}`);
                                                        }}
                                                        className="flex items-center gap-1 font-mono tracking-tight bg-muted/40 hover:bg-muted/80 p-1 px-1.5 rounded-md w-fit transition-colors"
                                                        title="Click to copy phone number"
                                                    >
                                                        <Phone className="h-3 w-3 shrink-0" />
                                                        {copiedId === `phone-${doctor.id}` ? "Copied!" : doctor.phone}
                                                    </span>
                                                )}
                                                {doctor.address && (
                                                    <div className="flex gap-2 mt-1">
                                                        <span
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCopy(doctor.address, `addr-${doctor.id}`);
                                                            }}
                                                            className="flex items-center gap-1 bg-primary/10 hover:bg-primary/20 text-primary p-1 px-1.5 rounded-md w-fit transition-colors"
                                                            title="Click to copy address"
                                                        >
                                                            <Copy className="h-3 w-3 shrink-0" />
                                                            {copiedId === `addr-${doctor.id}` ? "Address Copied!" : "Copy Address"}
                                                        </span>
                                                        <span
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const id = `nav-${doctor.id}`;
                                                                setCopiedId(id);
                                                                setTimeout(() => {
                                                                    setCopiedId(null);
                                                                    // Always use lat,lng so Google Maps points to the exact
                                                                    // same location as the Leaflet pin (avoids geocoding drift)
                                                                    const dest = `${doctor.lat},${doctor.lng}`;
                                                                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
                                                                }, 1000);
                                                            }}
                                                            className="flex items-center gap-1 bg-green-500/10 hover:bg-green-500/20 text-green-600 p-1 px-1.5 rounded-md w-fit transition-colors font-medium border border-green-500/20"
                                                            title="Navigate with Google Maps"
                                                        >
                                                            <MapPin className="h-3 w-3 shrink-0" />
                                                            {copiedId === `nav-${doctor.id}` ? "Opening Google Maps..." : "Get Directions"}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
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
