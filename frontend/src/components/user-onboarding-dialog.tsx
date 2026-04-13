import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createFamilyMember } from "@/app/actions/health"
import { useFamilyContext } from "@/app/family-context"
import { Activity, User } from "lucide-react"

export function UserOnboardingDialog() {
  const { familyMembers, isLoading, refresh } = useFamilyContext()
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    heartRate: "72",
    bloodPressure: "120/80",
    weight: "",
    height: ""
  })

  useEffect(() => {
    // Only open if we finished loading and there are no family members
    if (!isLoading && familyMembers.length === 0) {
      setIsOpen(true)
    } else if (familyMembers.length > 0) {
        setIsOpen(false)
    }
  }, [familyMembers, isLoading])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Create the "Self" primary profile
    const payload = {
        name: formData.name,
        relation: "Self",
        age: parseInt(formData.age),
        heartRate: parseInt(formData.heartRate),
        bloodPressure: formData.bloodPressure,
        weight: formData.weight ? parseInt(formData.weight) : 0,
        height: formData.height ? parseInt(formData.height) : 0,
        avatarColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`
    }

    const result = await createFamilyMember(payload)
    
    if (result.success) {
      setIsOpen(false)
      refresh() // Reload family members
    } else {
      alert("Failed to save profile.")
    }
    setIsSubmitting(false)
  }

  // Intercept dialog close to prevent users from closing it without filling
  // The app requires at least a primary user to function correctly
  const handleOpenChange = (open: boolean) => {
      if (!open && familyMembers.length === 0) {
          // Do nothing, force them to complete it
          return
      }
      setIsOpen(open)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
              <User className="w-6 h-6 text-primary" />
              Welcome to FamPlus
          </DialogTitle>
          <DialogDescription>
            Let's set up your primary health profile. Age is especially important for our AI to accurately assess your symptoms.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="name" className="text-sm font-medium text-muted-foreground">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="age" className="text-sm font-medium text-muted-foreground">Age (Required)</Label>
                <Input
                  id="age"
                  name="age"
                  type="number"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="e.g. 35"
                  required
                  min="1"
                  max="120"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight" className="text-sm font-medium text-muted-foreground">Weight (kg)</Label>
                <Input
                  id="weight"
                  name="weight"
                  type="number"
                  value={formData.weight}
                  onChange={handleChange}
                  placeholder="e.g. 70"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="heartRate" className="text-sm font-medium text-muted-foreground">Heart Rate (bpm)</Label>
                <div className="relative">
                    <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    <Input
                      id="heartRate"
                      name="heartRate"
                      type="number"
                      value={formData.heartRate}
                      onChange={handleChange}
                      placeholder="e.g. 72"
                      className="pl-9"
                    />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bloodPressure" className="text-sm font-medium text-muted-foreground">Blood Pressure (mmHg)</Label>
                <Input
                  id="bloodPressure"
                  name="bloodPressure"
                  value={formData.bloodPressure}
                  onChange={handleChange}
                  placeholder="e.g. 120/80"
                />
              </div>
          </div>

          <div className="pt-4">
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Saving..." : "Save My Profile"}
              </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
