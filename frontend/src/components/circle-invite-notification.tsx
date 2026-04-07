import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Users, Check, X, Bell } from "lucide-react"
import { getCircleInvites, acceptInvite } from "@/app/actions/user"
import { useFamilyContext } from "@/app/family-context"

export function CircleInviteNotification() {
  const [invites, setInvites] = useState<any[]>([])
  const { refresh } = useFamilyContext()

  useEffect(() => {
    const fetchInvites = async () => {
      const data = await getCircleInvites()
      if (Array.isArray(data) && data.length > 0) {
        setInvites(data)
      }
    }
    fetchInvites()
  }, [])

  const handleAccept = async (circleId: string) => {
    const res = await acceptInvite(circleId)
    if (res.success) {
      setInvites(invites.filter(i => i.id !== circleId))
      refresh() // Reload data for the new circle
      window.location.reload() // Force reload to ensure all data contexts update
    }
  }

  const handleReject = async (circleId: string) => {
    // We can add a reject backend endpoint, but for now just hide it locally
    // Since it's a student project, let's keep it simple.
    setInvites(invites.filter(i => i.id !== circleId))
  }

  if (invites.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
      {invites.map((invite) => (
        <div 
          key={invite.id} 
          className="bg-white rounded-2xl shadow-2xl border border-primary/20 p-6 flex flex-col gap-4 max-w-sm"
        >
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-xl">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Bell className="w-3.5 h-3.5 text-primary animate-bounce" />
                <span className="text-[10px] uppercase tracking-wider font-bold text-primary">Invitation</span>
              </div>
              <h3 className="font-bold text-slate-900 leading-tight">
                Join the {invite.name}?
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Once joined, you can see and manage shared family health data.
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 mt-2">
            <Button 
                onClick={() => handleAccept(invite.id)}
                className="flex-1 h-11 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white gap-2"
            >
              <Check className="w-4 h-4" /> Join Circle
            </Button>
            <Button 
                onClick={() => handleReject(invite.id)}
                variant="outline" 
                className="h-11 px-4 rounded-xl text-slate-400 hover:text-slate-600 border-slate-200"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
