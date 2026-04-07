import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, Mail, UserPlus, Shield, CheckCircle2 } from "lucide-react"
import { getCircleDetails, inviteToCircle } from "@/app/actions/user"
import { Badge } from "@/components/ui/badge"

export function ManageCircleDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [circle, setCircle] = useState<any>(null)
  const [inviteEmail, setInviteEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const currentUserId = localStorage.getItem('userId')

  const fetchDetails = async () => {
    const data = await getCircleDetails()
    if (data) setCircle(data)
  }

  useEffect(() => {
    if (isOpen) {
      fetchDetails()
      setMessage(null)
    }
  }, [isOpen])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)
    
    const res = await inviteToCircle(inviteEmail)
    if (res.success) {
      setMessage({ type: 'success', text: res.message || "Invite sent!" })
      setInviteEmail("")
      fetchDetails()
    } else {
      setMessage({ type: 'error', text: res.error || "Failed to invite" })
    }
    setIsLoading(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Users className="w-4 h-4" />
          Manage Circle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
              <Users className="w-6 h-6 text-primary" />
              {circle?.name || "Family Circle"}
          </DialogTitle>
          <DialogDescription>
            Invite family members to share your health dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Members List */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Members</Label>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
              {circle?.members?.map((member: any) => (
                <div key={member._id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {member.name?.[0].toUpperCase() || "U"}
                    </div>
                    <div>
                        <p className="text-sm font-medium leading-none">{member.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{member.email}</p>
                    </div>
                  </div>
                  {circle.ownerId === member._id && (
                      <Badge variant="secondary" className="gap-1 font-normal bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-indigo-100">
                          <Shield className="w-3 h-3" />
                          Owner
                      </Badge>
                  )}
                  {member._id === currentUserId && member._id !== circle.ownerId && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">You</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Invite Form */}
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">Invite by Email</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="family@email.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="pl-9 h-11"
                    required
                  />
                </div>
                <Button type="submit" disabled={isLoading || circle?.ownerId !== currentUserId} className="h-11 px-6">
                  {isLoading ? "Sending..." : "Invite"}
                </Button>
              </div>
              {circle?.ownerId !== currentUserId && (
                  <p className="text-[11px] text-amber-600 font-medium italic">Only the circle owner can invite new members.</p>
              )}
            </div>
            
            {message && (
              <div className={`p-3 rounded-md flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
                {message.text}
              </div>
            )}
            
            {/* Pending Invites List */}
            {circle?.pendingInvites?.length > 0 && (
                <div className="space-y-2">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold italic">Pending Invites</Label>
                    <div className="flex flex-wrap gap-2">
                        {circle.pendingInvites.map((email: string) => (
                            <Badge key={email} variant="outline" className="bg-slate-50/50 text-slate-500 font-normal">
                                {email}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
