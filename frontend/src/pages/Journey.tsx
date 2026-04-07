
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Activity, Heart, Users, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddMemberDialog } from "@/components/add-member-dialog"
import { EditFamilyMemberDialog } from "@/components/edit-family-member-dialog"
import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createFamilyMember } from "@/app/actions/health"
import { useFamilyContext } from "@/app/family-context"
import { useLocation } from "react-router-dom"



export default function JourneyPage() {
    const location = useLocation()
    const { familyMembers: rawMembers, isLoading, refresh } = useFamilyContext()

    // Re-fetch each time we land on this page
    useEffect(() => {
        refresh()
    }, [location.pathname])

    // Helper to cycle through pastel colors for new members
    const pastelColors = ["bg-pastel-mint", "bg-pastel-peach", "bg-pastel-blue", "bg-pastel-pink", "bg-pastel-purple"]

    const familyMembers = rawMembers.map((m: any, i: number) => ({
        ...m,
        cardColor: pastelColors[i % pastelColors.length],
        stats: {
            heartRate: m.heartRate || 0,
            bloodPressure: m.bloodPressure || "120/80",
            steps: m.steps || 0,
            sleep: m.sleep || "0h"
        },
        status: "Good"
    }))

    const handleAddMember = async (newMember: any) => {
        try {
            const result = await createFamilyMember({
                name: newMember.name,
                relation: newMember.relation,
                age: newMember.age,
                avatarColor: "bg-gray-100 text-gray-600",
                stats: {
                    heartRate: parseInt(newMember.stats?.heartRate || 0),
                    bloodPressure: newMember.stats?.bloodPressure || "120/80",
                    steps: parseInt(newMember.stats?.steps || 0),
                    sleep: newMember.stats?.sleep || "7h"
                }
            });
            if (result.success) refresh();
            else console.error(result.error);
        } catch (e) {
            console.error("Failed to add member", e)
        }
    }

    const [activeTab, setActiveTab] = useState("all")
    const selfMember = familyMembers.find(m => m.relation === "Self") || familyMembers[0]

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Users className="h-8 w-8 text-primary" />
                        Vitals Journey
                    </h2>
                    <p className="text-muted-foreground">Track health trends for your whole family.</p>
                </div>
                {/* Top Add Button (Optional, can be removed if relying on bottom card) */}
                <AddMemberDialog onAdd={handleAddMember} />
            </div>

            <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-6">
                    <TabsTrigger value="all">All Members</TabsTrigger>
                    <TabsTrigger value="self">My Vitals (Self)</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {familyMembers.map((member) => (
                            <Card key={member.id} className={`border-none shadow-sm overflow-hidden hover:shadow-md transition-all ${member.cardColor || "bg-card"}`}>
                                <CardHeader className="pb-4 border-b border-black/5">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg bg-white/50 backdrop-blur-sm text-foreground overflow-hidden`}>
                                                {member.avatar ? (
                                                    <img src={member.avatar} alt={member.name} className="w-full h-full object-cover pt-1" />
                                                ) : (
                                                    member.name?.[0] || 'A'
                                                )}
                                            </div>
                                            <div>
                                                <CardTitle className="text-xl">{member.name}</CardTitle>
                                                <CardDescription className="text-foreground/70">{member.relation} • {member.age} yrs</CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 items-start">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold bg-white/50 text-foreground`}>
                                                {member.status || "Good"}
                                            </span>
                                            {/* Pass flattened member object to dialog */}
                                            <div className="relative z-20">
                                                <EditFamilyMemberDialog
                                                    member={{
                                                        ...member,
                                                        heartRate: member.stats?.heartRate || member.heartRate,
                                                        bloodPressure: member.stats?.bloodPressure || member.bloodPressure,
                                                        steps: member.stats?.steps || member.steps,
                                                        sleep: member.stats?.sleep || member.sleep
                                                    }}
                                                    onUpdate={refresh}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-xs text-foreground/70 uppercase font-bold">Heart Rate</p>
                                        <div className="flex items-end gap-1">
                                            <span className="text-2xl font-bold text-foreground">{member.stats?.heartRate || member.heartRate}</span>
                                            <span className="text-xs text-foreground/70 mb-1">bpm</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-foreground/70 uppercase font-bold">BP</p>
                                        <div className="flex items-end gap-1">
                                            <span className="text-2xl font-bold text-foreground">{member.stats?.bloodPressure || member.bloodPressure}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-foreground/70 uppercase font-bold">Steps</p>
                                        <div className="flex items-end gap-1">
                                            <span className="text-2xl font-bold text-foreground">{((member.stats?.steps || member.steps) / 1000).toFixed(1)}k</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-foreground/70 uppercase font-bold">Sleep</p>
                                        <div className="flex items-end gap-1">
                                            <span className="text-2xl font-bold text-foreground">{member.stats?.sleep || member.sleep}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {/* Wired-up Add Member Card */}
                        <AddMemberDialog
                            onAdd={handleAddMember}
                            trigger={
                                <Card className="border-dashed border-2 bg-transparent shadow-none flex items-center justify-center p-6 min-h-[250px] cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all group h-full w-full">
                                    <div className="text-center space-y-2">
                                        <div className="w-12 h-12 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center mx-auto transition-colors">
                                            <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                                        </div>
                                        <p className="font-bold text-muted-foreground group-hover:text-primary">Add Family Member</p>
                                    </div>
                                </Card>
                            }
                        />
                    </div>
                </TabsContent>

                <TabsContent value="self" className="space-y-6">
                    {selfMember ? (
                        <Card className="bg-pastel-peach border-none shadow-sm relative overflow-hidden transition-all">
                            <div className="absolute top-0 right-0 p-10 opacity-10">
                                <Activity className="w-40 h-40 text-primary" />
                            </div>
                            <div className="absolute top-4 right-4 z-20">
                                <EditFamilyMemberDialog
                                    member={{
                                        ...selfMember,
                                        heartRate: selfMember.stats?.heartRate || selfMember.heartRate,
                                        bloodPressure: selfMember.stats?.bloodPressure || selfMember.bloodPressure,
                                        steps: selfMember.stats?.steps || selfMember.steps,
                                        sleep: selfMember.stats?.sleep || selfMember.sleep
                                    }}
                                    onUpdate={refresh}
                                />
                            </div>
                            <CardContent className="p-8 flex flex-col md:flex-row gap-8 items-center z-10 relative">
                                <div className="flex-1 space-y-4">
                                    <div className="flex gap-8">
                                        <div>
                                            <p className="text-3xl font-bold text-foreground">{selfMember.weight || 0}<span className="text-sm font-normal text-muted-foreground">kg</span></p>
                                            <p className="text-sm text-foreground/70 uppercase tracking-wider font-semibold">Weight</p>
                                        </div>
                                        <div>
                                            <p className="text-3xl font-bold text-foreground">{selfMember.height || 0}<span className="text-sm font-normal text-muted-foreground">cm</span></p>
                                            <p className="text-sm text-foreground/70 uppercase tracking-wider font-semibold">Height</p>
                                        </div>
                                        <div>
                                            <p className="text-3xl font-bold text-foreground">{selfMember.age}<span className="text-sm font-normal text-muted-foreground">yrs</span></p>
                                            <p className="text-sm text-foreground/70 uppercase tracking-wider font-semibold">Age</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white/80 dark:bg-black/20 backdrop-blur p-4 rounded-3xl shadow-sm flex items-center gap-4 min-w-[200px]">
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase font-bold">Heart Rate</p>
                                        <p className="text-2xl font-bold text-foreground">{selfMember.stats?.heartRate || selfMember.heartRate} <span className="text-xs font-normal">bpm</span></p>
                                        <p className="text-xs text-emerald-500 font-medium">Normal</p>
                                    </div>
                                    <Activity className="h-10 w-10 text-primary" />
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="text-center p-8 text-muted-foreground">
                            No personal profile found. Please add a family member with relation "Self".
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
