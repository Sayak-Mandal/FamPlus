
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
import { Plus } from "lucide-react"
import { useState, useEffect } from "react"

const AVATAR_SEEDS = [
    'Felix', 'Jasper', 'Abby', 'Bubba', 'Coco', 'Socks', 'Jack', 'Oliver', 'Molly', 'Simba',
    'Lola', 'Buster', 'Cleo', 'Max', 'Luna', 'Charlie', 'Daisy', 'Milo', 'Bella', 'Rocky',
    'Duke', 'Zoe', 'Sadie', 'Ginger'
];

export function AddMemberDialog({ onAdd, trigger }: { onAdd: (member: any) => void, trigger?: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    const [showAllAvatars, setShowAllAvatars] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        relation: "",
        age: "",
        heartRate: "",
        bpSystolic: "",
        bpDiastolic: "",
        steps: "",
        sleep: "",
        avatar: ""
    })

    useEffect(() => {
        if (!open) {
            setShowAllAvatars(false)
            setFormData({
                name: "", relation: "", age: "",
                heartRate: "", bpSystolic: "", bpDiastolic: "", steps: "", sleep: "", avatar: ""
            })
        }
    }, [open])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const newMember = {
            name: formData.name,
            relation: formData.relation,
            age: parseInt(formData.age),
            stats: {
                heartRate: formData.heartRate ? parseInt(formData.heartRate) : 72,
                bloodPressure: `${formData.bpSystolic || '120'}/${formData.bpDiastolic || '80'}`,
                steps: formData.steps ? parseInt(formData.steps) : 5000,
                sleep: formData.sleep || "7h 30m"
            },
            status: "Hypothetical",
            avatarColor: "bg-pastel-purple text-purple-700",
            avatar: formData.avatar
        }

        onAdd(newMember)
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button className="rounded-full gap-2">
                        <Plus className="w-4 h-4" /> Add Member
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-3xl p-0 overflow-hidden border-none shrink-0 border">
                <div className="p-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                    <DialogHeader>
                        <DialogTitle>Add Family Member</DialogTitle>
                        <DialogDescription>
                            Add a new profile and their current health stats.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                Name
                            </Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="col-span-3 rounded-xl"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="relation" className="text-right">
                                Relation
                            </Label>
                            <Input
                                id="relation"
                                value={formData.relation}
                                onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
                                className="col-span-3 rounded-xl"
                                placeholder="e.g. Brother"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="age" className="text-right">
                                Age
                            </Label>
                            <Input
                                id="age"
                                type="number"
                                value={formData.age}
                                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                className="col-span-3 rounded-xl"
                                required
                            />
                        </div>

                        <div className="border-t pt-4 mt-2">
                            <Label className="text-sm font-medium mb-3 block text-muted-foreground text-center">Select Cartoon Profile</Label>
                            <div className="flex flex-wrap justify-center gap-3 pb-2">
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
                            <Label className="mb-4 block text-center font-bold text-muted-foreground">Health Statistics</Label>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="hr">Heart Rate (bpm)</Label>
                                    <Input id="hr" type="number" value={formData.heartRate} onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })} className="rounded-xl" placeholder="72" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="steps">Steps</Label>
                                    <Input id="steps" type="number" value={formData.steps} onChange={(e) => setFormData({ ...formData, steps: e.target.value })} className="rounded-xl" placeholder="5000" />
                                </div>
                                <div className="space-y-2">
                                    <Label>BloodPressure</Label>
                                    <div className="flex gap-2">
                                        <Input placeholder="Sys (120)" value={formData.bpSystolic} onChange={(e) => setFormData({ ...formData, bpSystolic: e.target.value })} className="rounded-xl" />
                                        <span className="self-center">/</span>
                                        <Input placeholder="Dia (80)" value={formData.bpDiastolic} onChange={(e) => setFormData({ ...formData, bpDiastolic: e.target.value })} className="rounded-xl" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sleep">Sleep</Label>
                                    <Input id="sleep" value={formData.sleep} onChange={(e) => setFormData({ ...formData, sleep: e.target.value })} className="rounded-xl" placeholder="7h 30m" />
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="submit" className="rounded-xl w-full mt-4">Save Profile</Button>
                        </DialogFooter>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}
