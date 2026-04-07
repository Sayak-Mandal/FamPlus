
import { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { ShieldCheck, Loader2, CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react"
import { logVitals, analyzeAndLogSymptom } from "@/app/actions/health" // Updated import

// For demo purposes, we'll hardcode a family member ID or pass it as prop.
// In a real app, you'd select the family member.
interface HealthCheckDialogProps {
    familyMemberId?: string
}

export function HealthCheckDialog({ familyMemberId }: HealthCheckDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState<"vitals" | "symptoms" | "result">("vitals")
    const [result, setResult] = useState<any>(null)

    // Vitals State
    const [heartRate, setHeartRate] = useState("75")
    const [weight, setWeight] = useState("70")
    const [height, setHeight] = useState("175")
    const [hydration, setHydration] = useState("2000") // ml

    // Symptoms State
    const [symptoms, setSymptoms] = useState("")

    const handleSaveVitals = async () => {
        if (!familyMemberId) return
        setLoading(true)
        await logVitals(familyMemberId, {
            heartRate: parseInt(heartRate) || 0,
            weight: parseFloat(weight) || 0,
            height: parseFloat(height) || 0,
            hydration: parseInt(hydration) || 0,
        })
        setLoading(false)
        setStep("symptoms")
    }

    const handleAnalyzeSymptoms = async () => {
        if (!familyMemberId) return
        setLoading(true)

        // Call Server Action which calls Python Backend
        const response = await analyzeAndLogSymptom(familyMemberId, symptoms)

        setLoading(false)

        if (response.success && response.data) {
            setResult(response.data)
            setStep("result")
        } else {
            // Error handling (simple alert for now)
            alert(response.error || "Failed to analyze")
        }
    }

    const handleClose = () => {
        setOpen(false)
        setStep("vitals")
        setSymptoms("")
        setResult(null)
    }

    // Helper to get color/icon based on severity/confidence
    const getSeverityDetails = (confidence: number) => {
        if (confidence > 85) return { color: "text-red-500", icon: <AlertOctagon className="h-12 w-12 text-red-500" />, label: "High Confidence" }
        if (confidence > 60) return { color: "text-yellow-500", icon: <AlertTriangle className="h-12 w-12 text-yellow-500" />, label: "Moderate Confidence" }
        return { color: "text-green-500", icon: <CheckCircle2 className="h-12 w-12 text-green-500" />, label: "Low Confidence / Safe" }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Check Symptoms
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {step === "vitals" && "Log Vitals"}
                        {step === "symptoms" && "Symptom Check"}
                        {step === "result" && "AI Diagnosis Result"}
                    </DialogTitle>
                    <DialogDescription>
                        {step === "vitals" && "Record your current health stats for better AI analysis."}
                        {step === "symptoms" && "Describe how you're feeling today."}
                        {step === "result" && "Here is the assessment based on your symptoms."}
                    </DialogDescription>
                </DialogHeader>

                {step === "vitals" && (
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="heartRate" className="text-right">
                                Heart Rate
                            </Label>
                            <Input
                                id="heartRate"
                                value={heartRate}
                                onChange={(e) => setHeartRate(e.target.value)}
                                className="col-span-3"
                                placeholder="bpm"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="weight" className="text-right">
                                Weight
                            </Label>
                            <Input
                                id="weight"
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                className="col-span-3"
                                placeholder="kg"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="height" className="text-right">
                                Height
                            </Label>
                            <Input
                                id="height"
                                value={height}
                                onChange={(e) => setHeight(e.target.value)}
                                className="col-span-3"
                                placeholder="cm"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="hydration" className="text-right">
                                Hydration
                            </Label>
                            <Input
                                id="hydration"
                                value={hydration}
                                onChange={(e) => setHydration(e.target.value)}
                                className="col-span-3"
                                placeholder="ml"
                            />
                        </div>
                    </div>
                )}

                {step === "symptoms" && (
                    <div className="grid gap-4 py-4">
                        <Textarea
                            placeholder="Describe your symptoms (e.g., headache, fever, fatigue)..."
                            rows={5}
                            value={symptoms}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSymptoms(e.target.value)}
                        />
                    </div>
                )}

                {step === "result" && result && (
                    <div className="flex flex-col items-center gap-4 py-4 text-center">
                        {getSeverityDetails(result.confidence).icon}

                        <div className="space-y-2">
                            <h3 className="text-xl font-bold">{result.condition}</h3>
                            <p className={`text-sm font-medium ${getSeverityDetails(result.confidence).color}`}>
                                {getSeverityDetails(result.confidence).label} ({result.confidence}%)
                            </p>
                        </div>

                        <div className="w-full rounded-lg bg-muted p-4 text-left">
                            <p className="text-sm text-foreground">
                                <span className="font-semibold">Advice: </span> {result.advice}
                            </p>
                        </div>

                        <div className="w-full rounded-lg bg-blue-50 p-4 text-left dark:bg-blue-900/20">
                            <p className="text-sm text-foreground">
                                <span className="font-semibold">Recommended Specialist: </span> {result.specialist}
                            </p>
                        </div>

                        <p className="text-xs text-muted-foreground mt-2">
                            *This is an AI-generated assessment. Please consult a real doctor for medical advice.
                        </p>
                    </div>
                )}

                <DialogFooter>
                    {step === "vitals" && (
                        <Button onClick={handleSaveVitals} disabled={loading || !familyMemberId}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Next
                        </Button>
                    )}

                    {step === "symptoms" && (
                        <Button onClick={handleAnalyzeSymptoms} disabled={loading || !familyMemberId}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                            Analyze
                        </Button>
                    )}

                    {step === "result" && (
                        <Button onClick={handleClose}>
                            Done
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
