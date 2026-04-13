import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import { HealthCheckDialog } from "@/components/health-check-dialog"
import { DashboardGreeting } from "@/components/dashboard-greeting"
import { DashboardStatsGrid } from "@/components/dashboard-stats-grid"
import { getVitalsHistory } from "@/app/actions/health"
import { useFamilyContext } from "@/app/family-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ManageCircleDialog } from "@/components/manage-circle-dialog"
import { CircleInviteNotification } from "@/components/circle-invite-notification"
import { UserOnboardingDialog } from "@/components/user-onboarding-dialog"

export default function DashboardPage() {
    const location = useLocation()
    const { familyMembers, isLoading, refresh, selectedMemberId, setSelectedMemberId } = useFamilyContext()
    const [vitalsHistory, setVitalsHistory] = useState<any[]>([])

    // Fallback if selectedMemberId is null but members are loaded
    const primaryMember = (familyMembers.find(m => (m.id || m._id) === selectedMemberId) || familyMembers[0]) ?? null

    // Re-fetch from context every time we navigate to this page
    useEffect(() => {
        refresh()
    }, [location.pathname])

    useEffect(() => {
        if (!primaryMember) return
        const memberId = primaryMember.id || primaryMember._id
        getVitalsHistory(memberId).then(setVitalsHistory).catch(console.error)
    }, [primaryMember?.id, primaryMember?._id])

    if (isLoading) {
        return <div className="p-8">Loading dashboard...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <DashboardGreeting name={primaryMember?.name || "User"} />
                    <p className="text-muted-foreground">Here is your daily health overview.</p>
                </div>
                <div className="flex items-center gap-3">
                    <ManageCircleDialog />
                    <div className="h-8 w-[1px] bg-slate-200 hidden md:block mx-1" />
                    <Select value={selectedMemberId || undefined} onValueChange={setSelectedMemberId}>
                        <SelectTrigger className="w-[200px] bg-white">
                            <SelectValue placeholder="Select member" />
                        </SelectTrigger>
                        <SelectContent>
                            {familyMembers.map((member: any) => (
                                <SelectItem key={member.id || member._id} value={member.id || member._id}>
                                    {member.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {primaryMember && (
                        <HealthCheckDialog familyMemberId={primaryMember.id || primaryMember._id} />
                    )}
                </div>
            </div>

            {primaryMember && (
                <DashboardStatsGrid
                    key={primaryMember.id || primaryMember._id}
                    initialMember={primaryMember}
                    vitalsHistory={vitalsHistory}
                />
            )}
            
            {/* Popups & Notifications */}
            <UserOnboardingDialog />
            <CircleInviteNotification />
        </div>
    )
}
