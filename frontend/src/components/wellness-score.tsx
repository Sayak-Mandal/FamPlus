
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle, Activity, Loader2, MapPin } from "lucide-react"
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils"

interface WellnessScoreProps {
    vitalsHistory: any[]
    currentMember?: any
}

export function WellnessScore({ vitalsHistory, currentMember }: WellnessScoreProps) {
    const [prediction, setPrediction] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    useEffect(() => {
        const controller = new AbortController()
        
        const fetchWellness = async () => {
            try {
                setLoading(true)
                // Determine the data payload
                let payload = vitalsHistory.map(log => ({
                    bloodPressure: "120/80",
                    heartRate: log.heartRate,
                    steps: 0,
                    sleep: "7h"
                }))

                if (currentMember) {
                    const liveEntry = {
                        bloodPressure: "120/80",
                        heartRate: currentMember.heartRate || 70,
                        steps: currentMember.steps || 0,
                        sleep: currentMember.sleep || "7h"
                    }
                    payload = [...payload, liveEntry]
                }

                const res = await fetch("http://localhost:8000/predict_wellness", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ vitals_history: payload }),
                    signal: controller.signal
                })

                if (!res.ok) throw new Error("AI Service Failed")

                const data = await res.json()
                setPrediction(data)
                setError(false)
            } catch (e: any) {
                if (e.name !== 'AbortError') {
                    console.error("WellnessScore fetch error:", e)
                    setError(true)
                }
            } finally {
                setLoading(false)
            }
        }

        fetchWellness()
        
        return () => controller.abort()
    }, [vitalsHistory.length, currentMember?.id, currentMember?.heartRate, currentMember?.steps, currentMember?.sleep])

    if (loading) return <div className="p-4"><Loader2 className="animate-spin" /></div>
    if (error) return null // Hide if AI is down (fail gracefully)
    if (!prediction) return null

    const isHighRisk = prediction.status.includes("High Risk")
    const isWarning = prediction.status.includes("Monitoring")

    return (
        <Card
            className="border-none shadow-sm overflow-hidden text-white transition-all"
            style={{
                backgroundColor: isHighRisk ? "#ef4444" : isWarning ? "#f97316" : "#10b981"
            }}
        >
            <CardContent className="p-6">
                <div className="flex justify-between items-start gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            {isHighRisk ? <AlertTriangle className="h-6 w-6 text-white" /> : <CheckCircle className="h-6 w-6 text-white" />}
                            <h3 className="font-bold text-lg">{prediction.status}</h3>
                        </div>
                        <p className="text-white/90 text-sm mb-4">{prediction.recommendation}</p>

                        {prediction.anomalies.length > 0 && (
                            <div className="bg-black/20 rounded-lg p-3 text-xs mb-4">
                                <p className="font-bold mb-1 opacity-80">Detected Anomalies:</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    {prediction.anomalies.map((a: string, i: number) => (
                                        <li key={i}>{a}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="flex items-center gap-4">
                            <div className="text-center">
                                <span className="text-3xl font-bold">{prediction.score}</span>
                                <span className="text-xs opacity-80 block">Wellness Score</span>
                            </div>

                            {isHighRisk && (
                                <Link to="/find-care">
                                    <Button
                                        size="sm"
                                        className="!bg-red-100 hover:!bg-red-200 text-red-700 shadow-sm font-bold border-none transition-all hover:scale-105 active:scale-95 rounded-3xl px-6 py-4 h-auto flex items-center justify-between gap-4 min-w-[200px]"
                                        style={{ backgroundColor: "#fee2e2", color: "#b91c1c" }}
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className="text-xs uppercase text-red-500 font-medium">Emergency</span>
                                            <span className="text-lg font-bold text-red-700">Find Hospital</span>
                                        </div>
                                        <div className="bg-white p-2 rounded-full shadow-sm">
                                            <MapPin className="h-6 w-6 text-red-600" />
                                        </div>
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
