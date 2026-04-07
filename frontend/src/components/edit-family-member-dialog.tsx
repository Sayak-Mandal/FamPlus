
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Pencil, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { updateFamilyMember } from "@/app/actions/health"

interface EditFamilyMemberDialogProps {
    member: {
        id: string
        name: string
        age: number
        relation: string
        heartRate?: number
        bloodPressure?: string
        steps?: number
        sleep?: string
        avatar?: string
        workouts?: number
        water?: number
        activeCalories?: number
    }
    onUpdate?: (updatedMember?: any) => void
}

const AVATAR_SEEDS = [
    'Felix', 'Jasper', 'Abby', 'Bubba', 'Coco', 'Socks', 'Jack', 'Oliver', 'Molly', 'Simba',
    'Lola', 'Buster', 'Cleo', 'Max', 'Luna', 'Charlie', 'Daisy', 'Milo', 'Bella', 'Rocky',
    'Duke', 'Zoe', 'Sadie', 'Ginger'
];

export function EditFamilyMemberDialog({ member, onUpdate }: EditFamilyMemberDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [showAllAvatars, setShowAllAvatars] = useState(false)
    const [formData, setFormData] = useState({
        name: member.name,
        age: member.age.toString(),
        relation: member.relation,
        heartRate: member.heartRate?.toString() || "",
        bloodPressure: member.bloodPressure || "",
        steps: member.steps?.toString() || "",
        sleep: member.sleep || "",
        avatar: member.avatar || "",
        workouts: member.workouts?.toString() || "",
        water: member.water?.toString() || "",
        activeCalories: member.activeCalories?.toString() || "",
    })

    useEffect(() => {
        if (!open) {
            setShowAllAvatars(false)
            setFormData({
                name: member.name,
                age: member.age.toString(),
                relation: member.relation,
                heartRate: member.heartRate?.toString() || "",
                bloodPressure: member.bloodPressure || "",
                steps: member.steps?.toString() || "",
                sleep: member.sleep || "",
                avatar: member.avatar || "",
                workouts: member.workouts?.toString() || "",
                water: member.water?.toString() || "",
                activeCalories: member.activeCalories?.toString() || "",
            })
        } else {
            const hasHiddenAvatar = Boolean(member.avatar && !AVATAR_SEEDS.slice(0, 3).some(seed => member.avatar === `https://api.dicebear.com/7.x/notionists/svg?seed=${seed}&backgroundColor=transparent`))
            setShowAllAvatars(hasHiddenAvatar)
        }
    }, [open, member])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const updatedData = {
            name: formData.name,
            age: parseInt(formData.age) || 0,
            relation: formData.relation,
            heartRate: parseInt(formData.heartRate) || 0,
            bloodPressure: formData.bloodPressure,
            steps: parseInt(formData.steps) || 0,
            sleep: formData.sleep,
            avatar: formData.avatar,
            workouts: parseInt(formData.workouts) || 0,
            water: parseFloat(formData.water) || 0,
            activeCalories: parseInt(formData.activeCalories) || 0,
        }

        await updateFamilyMember(member.id, updatedData)

        if (onUpdate) {
            onUpdate({ ...member, ...updatedData })
        }

        setLoading(false)
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                    <Pencil className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-3xl p-0 overflow-hidden border-none shrink-0 border">
                <div className="p-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                    <DialogHeader>
                        <DialogTitle>Edit Profile & Vitals</DialogTitle>
                        <DialogDescription>
                            Update details for {member.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="h-8"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="relation">Relation</Label>
                                <Input
                                    id="relation"
                                    value={formData.relation}
                                    onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
                                    required
                                    className="h-8"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="age">Age</Label>
                                <Input
                                    id="age"
                                    type="number"
                                    value={formData.age}
                                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                    required
                                    className="h-8"
                                />
                            </div>
                        </div>

                        <div className="border-t pt-4 mt-2">
                            <Label className="text-sm font-medium mb-3 block text-muted-foreground">Select Cartoon Profile</Label>
                            <div className="flex flex-wrap gap-3 pb-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, avatar: '' })}
                                    className={`h-16 w-16 shrink-0 rounded-full flex items-center justify-center font-bold text-lg transition-all ${!formData.avatar ? 'ring-2 ring-primary ring-offset-2 bg-primary/20 text-primary' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                                >
                                    {formData.name?.[0] || 'A'}
                                </button>
                                {(showAllAvatars ? AVATAR_SEEDS : AVATAR_SEEDS.slice(0, 3)).map((seed) => {
                                    const url = `https://api.dicebear.com/7.x/notionists/svg?seed=${seed}&backgroundColor=transparent`;
                                    const isSelected = formData.avatar === url;
                                    return (
                                        <button
                                            key={seed}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, avatar: url })}
                                            className={`h-16 w-16 shrink-0 rounded-full overflow-hidden transition-all bg-pastel-blue ${isSelected ? 'ring-2 ring-primary ring-offset-2' : 'hover:ring-2 hover:ring-primary/50'}`}
                                        >
                                            <img src={url} alt="avatar" className="w-full h-full object-cover pt-1" />
                                        </button>
                                    );
                                })}
                                {!showAllAvatars && (
                                    <button
                                        type="button"
                                        onClick={() => setShowAllAvatars(true)}
                                        className="h-16 w-16 shrink-0 rounded-full flex flex-col items-center justify-center transition-all bg-muted text-muted-foreground hover:bg-muted/80 text-xs font-medium"
                                    >
                                        <span>+{AVATAR_SEEDS.length - 3}</span>
                                        <span>More</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="border-t pt-4 mt-2">
                            <p className="text-sm font-medium mb-3 text-muted-foreground">Current Vitals</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="heartRate" className="text-xs">Heart Rate</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="heartRate"
                                            type="number"
                                            value={formData.heartRate}
                                            onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                                            className="h-8"
                                        />
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">bpm</span>
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="bloodPressure" className="text-xs">Blood Pressure</Label>
                                    <Input
                                        id="bloodPressure"
                                        value={formData.bloodPressure}
                                        onChange={(e) => setFormData({ ...formData, bloodPressure: e.target.value })}
                                        placeholder="120/80"
                                        className="h-8"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="steps" className="text-xs">Steps</Label>
                                    <Input
                                        id="steps"
                                        type="number"
                                        value={formData.steps}
                                        onChange={(e) => setFormData({ ...formData, steps: e.target.value })}
                                        className="h-8"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="sleep" className="text-xs">Sleep</Label>
                                    <Input
                                        id="sleep"
                                        value={formData.sleep}
                                        onChange={(e) => setFormData({ ...formData, sleep: e.target.value })}
                                        placeholder="7h"
                                        className="h-8"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="workouts" className="text-xs">Workouts (per week)</Label>
                                    <Input
                                        id="workouts"
                                        type="number"
                                        value={formData.workouts}
                                        onChange={(e) => setFormData({ ...formData, workouts: e.target.value })}
                                        className="h-8"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="water" className="text-xs">Water (L)</Label>
                                    <Input
                                        id="water"
                                        type="number"
                                        step="0.1"
                                        value={formData.water}
                                        onChange={(e) => setFormData({ ...formData, water: e.target.value })}
                                        className="h-8"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="activeCalories" className="text-xs">Active Calories</Label>
                                    <Input
                                        id="activeCalories"
                                        type="number"
                                        value={formData.activeCalories}
                                        onChange={(e) => setFormData({ ...formData, activeCalories: e.target.value })}
                                        className="h-8"
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={loading} size="sm">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}
