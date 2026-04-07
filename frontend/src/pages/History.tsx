import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import { VitalsHistoryList } from "@/components/vitals-history-list"
import { History, Activity, Heart, Footprints, Moon, User } from "lucide-react"
import { getVitalsHistory } from "@/app/actions/health"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useFamilyContext } from "@/app/family-context"

export default function HistoryPage() {
    const location = useLocation()
    const { familyMembers, isLoading, refresh } = useFamilyContext()

    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
    const [vitalsHistory, setVitalsHistory] = useState<any[]>([])
    const [vitalsLoading, setVitalsLoading] = useState(false)

    // Re-fetch shared context each time we navigate here
    useEffect(() => {
        refresh()
    }, [location.pathname])

    // Auto-select first member once loaded
    useEffect(() => {
        if (familyMembers.length > 0 && !selectedMemberId) {
            setSelectedMemberId(familyMembers[0].id)
        }
    }, [familyMembers, selectedMemberId])

    const fetchVitals = async (memberId: string) => {
        setVitalsLoading(true)
        try {
            const history = await getVitalsHistory(memberId)
            setVitalsHistory(history.map((log: any) => ({
                id: log._id || log.id,
                recordedAt: log.recordedAt,
                weight: log.weight,
                height: log.height,
                heartRate: log.heartRate,
                hydration: log.hydration,
            })))
        } catch (e) {
            console.error(e)
            setVitalsHistory([])
        } finally {
            setVitalsLoading(false)
        }
    }

    useEffect(() => {
        if (selectedMemberId) {
            fetchVitals(selectedMemberId)
        }
    }, [selectedMemberId])

    const selectedMember = familyMembers.find(m => m.id === selectedMemberId)

    const handleUpdated = () => {
        refresh()
        if (selectedMemberId) fetchVitals(selectedMemberId)
    }

    if (isLoading) {
        return (
            <div className="p-8 flex items-center gap-3 text-muted-foreground">
                <Activity className="h-5 w-5 animate-pulse" />
                Loading history...
            </div>
        )
    }

    if (familyMembers.length === 0) {
        return <div className="p-8 text-muted-foreground">Please log in or add a family member to view history.</div>
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <History className="h-8 w-8 text-primary" />
                    History & Edits
                </h2>
                <p className="text-muted-foreground">View and manage your complete vitals log per family member.</p>
            </div>

            {/* Member Selector */}
            <div className="flex flex-wrap gap-3">
                {familyMembers.map(member => (
                    <button
                        key={member.id}
                        onClick={() => setSelectedMemberId(member.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border
                            ${selectedMemberId === member.id
                                ? 'bg-primary text-primary-foreground border-primary shadow-md'
                                : 'bg-muted text-muted-foreground border-transparent hover:border-primary/40 hover:bg-muted/80'
                            }`}
                    >
                        {member.avatar ? (
                            <img src={member.avatar} alt={member.name} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                                ${selectedMemberId === member.id ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                                {member.name?.[0] || 'A'}
                            </span>
                        )}
                        {member.name}
                        <span className="text-xs opacity-70">{member.relation}</span>
                    </button>
                ))}
            </div>

            {/* Selected Member: Current Profile Snapshot */}
            {selectedMember && (
                <Card className="border-none shadow-sm bg-card">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
                            <User className="h-4 w-4" />
                            Current Profile — {selectedMember.name}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Age</p>
                                <p className="text-xl font-bold">{selectedMember.age ?? '—'}<span className="text-xs font-normal text-muted-foreground ml-1">yrs</span></p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Relation</p>
                                <p className="text-xl font-bold">{selectedMember.relation || '—'}</p>
                            </div>
                            <div className="space-y-1 flex flex-col">
                                <p className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1"><Heart className="h-3 w-3 text-red-400" /> Heart Rate</p>
                                <p className="text-xl font-bold">{selectedMember.heartRate ?? selectedMember.stats?.heartRate ?? '—'}<span className="text-xs font-normal text-muted-foreground ml-1">bpm</span></p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Blood Pressure</p>
                                <p className="text-xl font-bold">{selectedMember.bloodPressure || selectedMember.stats?.bloodPressure || '—'}</p>
                            </div>
                            <div className="space-y-1 flex flex-col">
                                <p className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1"><Footprints className="h-3 w-3 text-blue-400" /> Steps</p>
                                <p className="text-xl font-bold">{selectedMember.steps != null ? (selectedMember.steps / 1000).toFixed(1) + 'k' : '—'}</p>
                            </div>
                            <div className="space-y-1 flex flex-col">
                                <p className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1"><Moon className="h-3 w-3 text-purple-400" /> Sleep</p>
                                <p className="text-xl font-bold">{selectedMember.sleep || selectedMember.stats?.sleep || '—'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Vitals Log Table */}
            {vitalsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground p-4">
                    <Activity className="h-4 w-4 animate-pulse" /> Loading vitals...
                </div>
            ) : (
                <VitalsHistoryList
                    logs={vitalsHistory}
                    familyMemberId={selectedMemberId!}
                    onUpdated={handleUpdated}
                />
            )}
        </div>
    )
}
