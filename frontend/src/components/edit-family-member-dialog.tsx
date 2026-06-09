
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
import { Pencil, Loader2, CheckCircle2 } from "lucide-react"
import { useState, useEffect } from "react"
import { updateFamilyMember } from "@/app/actions/health"
import { useFamilyContext } from "@/app/family-context"

/**
 * Interface defining the expected schema of a family member 
 * object passed into the editing dialog.
 */
interface EditFamilyMemberDialogProps {
    member: {
        id?: string
        _id?: string
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

/**
 * @component EditFamilyMemberDialog
 * @description A modal dialog used for updating a family member's core profile 
 * (Name, Age) and current vitals/health metrics. Also allows changing their 
 * procedural avatar. Syncs updates globally via `FamilyContext`.
 */
export function EditFamilyMemberDialog({ member, onUpdate }: EditFamilyMemberDialogProps) {
    const { refresh } = useFamilyContext()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [saved, setSaved] = useState(false)
    const [isEditingAvatar, setIsEditingAvatar] = useState(false)
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
        weight: (member as any).weight?.toString() || "",
        height: (member as any).height?.toString() || "",
    })

    // Synchronize local form state with the incoming member prop
    // whenever the dialog is closed or the underlying member changes.
    useEffect(() => {
        if (!open) {
            setIsEditingAvatar(false)
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
                weight: (member as any).weight?.toString() || "",
                height: (member as any).height?.toString() || "",
            })
        }
    }, [open, member])

    /**
     * Handles form submission, converting string inputs back to appropriate 
     * numerical types before calling the backend update action.
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const memberId = member._id || member.id || ''
        if (!memberId) {
            console.error('EditFamilyMemberDialog: member has no id or _id — cannot save.')
            setLoading(false)
            return
        }

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
            weight: parseFloat(formData.weight) || 0,
            height: parseFloat(formData.height) || 0,
        }

        const result = await updateFamilyMember(memberId, updatedData)

        setLoading(false)

        if (result.success) {
            // Notify the local parent component immediately for snappy UI
            if (onUpdate) {
                onUpdate({ ...member, ...updatedData })
            }
            // Refresh global context so sidebar, dropdowns & other pages are in sync
            await refresh()
            setSaved(true)
            setTimeout(() => {
                setSaved(false)
                setOpen(false)
            }, 800)
        } else {
            console.error('Failed to save member:', result.error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                    <Pencil className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-3xl p-0 overflow-hidden border-none shrink-0 border">
                <div className="p-6 max-h-[85vh] overflow-y-auto custom-scrollbar relative">
                    <button
                        type="button"
                        onClick={() => setIsEditingAvatar(!isEditingAvatar)}
                        className="absolute right-12 top-3.5 z-10 group h-12 w-12 shrink-0 rounded-full overflow-hidden transition-all hover:ring-2 hover:ring-primary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 bg-pastel-blue"
                    >
                        {formData.avatar ? (
                            <img src={formData.avatar} alt="avatar" className="w-full h-full object-cover pt-1" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-lg bg-primary/20 text-primary">
                                {formData.name?.[0] || 'A'}
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Pencil className="h-4 w-4 text-white" />
                        </div>
                    </button>
                    <DialogHeader className="pr-16">
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

                        {isEditingAvatar && (
                            <div className="border-t pt-4 mt-2 animate-in fade-in slide-in-from-top-2">
                                <Label className="text-sm font-medium mb-3 block text-muted-foreground">Select Cartoon Profile</Label>
                                <div className="flex flex-wrap gap-3 pb-2">
                                    <button
                                        type="button"
                                        onClick={() => { setFormData({ ...formData, avatar: '' }); setIsEditingAvatar(false); }}
                                        className={`h-16 w-16 shrink-0 rounded-full flex items-center justify-center font-bold text-lg transition-all ${!formData.avatar ? 'ring-2 ring-primary ring-offset-2 bg-primary/20 text-primary' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                                    >
                                        {formData.name?.[0] || 'A'}
                                    </button>
                                    {AVATAR_SEEDS.map((seed) => {
                                        const url = `https://api.dicebear.com/7.x/notionists/svg?seed=${seed}&backgroundColor=transparent`;
                                        const isSelected = formData.avatar === url;
                                        return (
                                            <button
                                                key={seed}
                                                type="button"
                                                onClick={() => { setFormData({ ...formData, avatar: url }); setIsEditingAvatar(false); }}
                                                className={`h-16 w-16 shrink-0 rounded-full overflow-hidden transition-all bg-pastel-blue ${isSelected ? 'ring-2 ring-primary ring-offset-2' : 'hover:ring-2 hover:ring-primary/50'}`}
                                            >
                                                <img src={url} alt="avatar" className="w-full h-full object-cover pt-1" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="border-t pt-4 mt-2">
                            <p className="text-sm font-medium mb-3 text-muted-foreground">Current Vitals</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="weight" className="text-xs">Weight</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="weight"
                                            type="number"
                                            step="0.1"
                                            value={formData.weight}
                                            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                                            placeholder="70"
                                            className="h-8"
                                        />
                                        <span className="text-xs text-muted-foreground">kg</span>
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="height" className="text-xs">Height</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="height"
                                            type="number"
                                            step="0.1"
                                            value={formData.height}
                                            onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                                            placeholder="170"
                                            className="h-8"
                                        />
                                        <span className="text-xs text-muted-foreground">cm</span>
                                    </div>
                                </div>
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
                            <Button type="submit" disabled={loading || saved} size="sm">
                                {loading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : saved ? (
                                    <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                                ) : null}
                                {saved ? 'Saved!' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}
