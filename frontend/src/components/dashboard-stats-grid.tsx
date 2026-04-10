
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Moon, Flame, Droplets, Footprints, Dumbbell } from "lucide-react"
import { VitalsChart } from "@/components/vitals-chart"
import { EditFamilyMemberDialog } from "@/components/edit-family-member-dialog"
import { WellnessScore } from "@/components/wellness-score"

interface DashboardStatsGridProps {
    initialMember: any
    vitalsHistory: any[]
}

export function DashboardStatsGrid({ initialMember, vitalsHistory }: DashboardStatsGridProps) {
    const [member, setMember] = useState(initialMember)

    const handleUpdate = (updatedData?: any) => {
        if (updatedData) {
            // Merge updated data into local state
            setMember((prev: any) => ({ ...prev, ...updatedData }))
        }
    }

    // Latest Stats (from member or last log) - prioritizing member's current snapshot
    // Note: weight/height come from vitalsHistory logs usually, but let's assume if edited they might update member or we need to refetch.
    // For this specific request, the user mentioned steps/sleep which are directly on the member model (snapshot).
    // Weight/Height are technically in VitalLogs. If the dialog edits them, it currently updates FamilyMember model (?)
    // Let's check updateFamilyMember action... 
    // Assuming the dialog updates the fields we display.

    // If weight/height are ONLY in logs, we might need a way to pass them back.
    // But assuming the dialog updates the 'snapshot' fields on FamilyMember if they exist, or we just trust the return value.

    // For simplicity and immediate feedback, we use the member state.
    // However, weight/height might be derived from history in the original page.
    // Let's look at how original page did it:
    // const currentWeight = vitalsHistory.length > 0 ? vitalsHistory[vitalsHistory.length - 1].weight : 0

    // If the edit dialog updates weight, it might not update the history log immediately unless we refetch.
    // BUT the user specifically asked for "left tab if sleep, steps are edited must also be linked to the right side".
    // Steps and Sleep are on the FamilyMember model. Weight/Height are usually logs.

    const currentWeight = vitalsHistory.length > 0 ? vitalsHistory[0].weight : 0
    const currentHeight = vitalsHistory.length > 0 ? vitalsHistory[0].height : 0

    // If the dialog allows editing weight/height, we might want to override these if 'member' has them 
    // (though our schema separates them). 
    // For now, let's focus on Steps, Sleep, Heart Rate which are on the member.

    return (
        <div className="space-y-6">
            {/* AI Wellness Score - Now Live! */}
            <WellnessScore
                vitalsHistory={vitalsHistory}
                currentMember={member}
            />

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* Left Column - Large Stats (Span 8) */}
                <div className="md:col-span-8 flex flex-col gap-6">
                    {/* Personal Stats Card */}
                    <Card className="bg-pastel-peach border-none shadow-sm relative overflow-hidden transition-all hover:shadow-md">
                        <div className="absolute top-0 right-0 p-10 opacity-10">
                            <Activity className="w-40 h-40 text-primary" />
                        </div>
                        <div className="absolute top-2 right-4 z-20">
                            <div className="h-11 w-11 flex items-center justify-center"> {/* 44x44px Touch Target Wrapper */}
                                <EditFamilyMemberDialog member={member} onUpdate={handleUpdate} />
                            </div>
                        </div>
                        <CardContent className="p-8 flex flex-col md:flex-row gap-8 items-center z-10 relative">
                            <div className="flex-1 space-y-4">
                                <div className="flex gap-8">
                                    <div>
                                        <p className="text-3xl font-bold text-foreground">{currentWeight}<span className="text-sm font-normal text-muted-foreground">kg</span></p>
                                        <p className="text-sm text-foreground/70 uppercase tracking-wider font-semibold">Weight</p>
                                    </div>
                                    <div>
                                        <p className="text-3xl font-bold text-foreground">{currentHeight}<span className="text-sm font-normal text-muted-foreground">cm</span></p>
                                        <p className="text-sm text-foreground/70 uppercase tracking-wider font-semibold">Height</p>
                                    </div>
                                    <div>
                                        <p className="text-3xl font-bold text-foreground">{member.age}<span className="text-sm font-normal text-muted-foreground">yrs</span></p>
                                        <p className="text-sm text-foreground/70 uppercase tracking-wider font-semibold">Age</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white/90 border border-white/20 backdrop-blur-md p-4 rounded-3xl shadow-md flex items-center gap-4 min-w-[200px]">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold">Heart Rate</p>
                                    <p className="text-2xl font-bold text-foreground">{member.heartRate || 0} <span className="text-xs font-normal">bpm</span></p>
                                    <p className={`text-xs font-medium ${(member.heartRate > 100 || member.heartRate < 50) ? 'text-red-500' :
                                            (member.heartRate > 90 || member.heartRate < 60) ? 'text-orange-500' : 'text-emerald-500'
                                        }`}>
                                        {(member.heartRate > 100) ? 'High (Tachycardia)' :
                                            (member.heartRate > 90) ? 'Elevated' :
                                                (member.heartRate < 50) ? 'Low (Bradycardia)' :
                                                    (member.heartRate < 60) ? 'Low' : 'Normal'}
                                    </p>
                                </div>
                                <Activity className="h-10 w-10 text-primary" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Weekly Activity Chart */}
                    <Card className="border-none shadow-sm overflow-hidden bg-card">
                        <CardHeader>
                            <CardTitle>Weekly Activities</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[250px] md:h-[300px] p-0 md:p-6 pt-0">
                            <VitalsChart data={vitalsHistory} />
                        </CardContent>
                    </Card>

                    {/* Weekly Goal Progress */}
                    <Card className="border-none shadow-sm bg-pastel-mint">
                        <CardContent className="p-4 md:p-6 flex flex-col sm:flex-row gap-6 md:gap-8 justify-around items-start sm:items-center">
                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                <div className="h-11 w-11 rounded-full bg-white/50 flex items-center justify-center shrink-0">
                                    <Footprints className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-emerald-900 leading-none">Steps</p>
                                    <p className="text-xs text-emerald-700 mt-1">{member.steps || 0} / 10,000</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                <div className="h-11 w-11 rounded-full bg-white/50 flex items-center justify-center shrink-0">
                                    <Dumbbell className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-emerald-900 leading-none">Workouts</p>
                                    <p className="text-xs text-emerald-700 mt-1">{member.workouts || 0} / 5</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                <div className="h-11 w-11 rounded-full bg-white/50 flex items-center justify-center shrink-0">
                                    <Droplets className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-emerald-900 leading-none">Water</p>
                                    <p className="text-xs text-emerald-700 mt-1">{member.water || 0}L / 2.75L</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Metrics & Lists (Span 4) */}
                <div className="md:col-span-4 flex flex-col gap-6">

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Active Calories */}
                        <Card className="bg-pastel-pink border-none shadow-sm transition-all hover:scale-105">
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-2">
                                    <Flame className="h-4 w-4 text-pink-700" />
                                    <span className="text-xs font-bold text-pink-900">Active Cal</span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center">
                                    <span className="text-3xl font-bold text-pink-900">{member.activeCalories || 0}</span>
                                    <p className="text-[10px] text-pink-700">Goal 600</p>
                                </div>
                            </CardContent>
                        </Card>
                        {/* Water Dark */}
                        <Card className="bg-pastel-blue border-none shadow-sm transition-all hover:scale-105">
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-2">
                                    <Droplets className="h-4 w-4 text-blue-700" />
                                    <span className="text-xs font-bold text-blue-900">Water</span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center">
                                    <span className="text-3xl font-bold text-blue-900">{member.water || 0}</span>
                                    <p className="text-[10px] text-blue-700">Liters</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Steps Today - LINKED to member.steps */}
                        <Card className="bg-pastel-purple border-none shadow-sm transition-all hover:scale-105">
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-2">
                                    <Footprints className="h-4 w-4 text-purple-700" />
                                    <span className="text-xs font-bold text-purple-900">Steps</span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center">
                                    <span className="text-2xl font-bold text-purple-900">
                                        {(member.steps && member.steps > 999) ? `${(member.steps / 1000).toFixed(1)}k` : (member.steps || 0)}
                                    </span>
                                    <p className="text-[10px] text-purple-700">Goal 10,000</p>
                                </div>
                            </CardContent>
                        </Card>
                        {/* Sleep - LINKED to member.sleep */}
                        <Card className="bg-[#1E1E2C] text-white border-none shadow-sm transition-all hover:scale-105">
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-2">
                                    <Moon className="h-4 w-4 text-yellow-300" />
                                    <span className="text-xs font-bold text-gray-200">Sleep</span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center">
                                    <span className="text-2xl font-bold">{member.sleep || "0h"}</span>
                                    <p className="text-[10px] text-gray-400">Goal 8h</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recent Workouts List */}
                    <Card className="flex-1 border-none shadow-sm bg-card">
                        <CardHeader>
                            <CardTitle className="text-lg">Recent Workouts</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl shadow-sm hover:bg-muted transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                                        <Activity className="h-5 w-5 text-orange-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-foreground">Running</p>
                                        <p className="text-xs text-muted-foreground">07:00 AM • 45 min</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-foreground">420 cal</p>
                                    <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">High</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl shadow-sm hover:bg-muted transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                        <Dumbbell className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-foreground">Strength</p>
                                        <p className="text-xs text-muted-foreground">06:00 PM • 60 min</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-foreground">380 cal</p>
                                    <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">Med</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>

        </div>
    )
}
