
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

    const isHighRisk = prediction.status.includes("High Risk") || prediction.status.includes("Consult a Doctor")
    const isWarning = prediction.status.includes("Monitoring")

    // Modern glassmorphism design styles mapping
    const getStyles = () => {
        if (isHighRisk) {
            return {
                cardClass: "bg-red-500/10 dark:bg-red-950/20 border border-red-500/20 dark:border-red-800/30 text-red-950 dark:text-red-100 shadow-[0_8px_32px_0_rgba(239,68,68,0.08)]",
                icon: <AlertTriangle className="h-6 w-6 text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-950/50 p-1 rounded-full shrink-0" />,
                titleClass: "text-red-950 dark:text-red-100 font-bold text-lg",
                descClass: "text-red-800/90 dark:text-red-300/90 text-sm mb-4 font-medium",
                anomaliesClass: "bg-red-500/5 dark:bg-red-950/40 border border-red-500/10 dark:border-red-900/30 text-red-900 dark:text-red-300 rounded-xl p-3 text-xs mb-4 backdrop-blur-sm",
                scoreClass: "text-3xl font-black text-red-950 dark:text-red-100",
                scoreLabelClass: "text-xs text-red-800/80 dark:text-red-400/80 font-semibold block mt-0.5",
                blobs: (
                    <>
                        <div className="absolute -right-16 -bottom-16 w-56 h-56 rounded-full bg-red-400/25 blur-3xl pointer-events-none z-0 animate-glass-blob-1" />
                        <div className="absolute -left-16 -top-16 w-56 h-56 rounded-full bg-rose-300/20 blur-3xl pointer-events-none z-0 animate-glass-blob-2" />
                    </>
                )
            }
        }
        if (isWarning) {
            return {
                cardClass: "bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/20 dark:border-amber-800/30 text-amber-950 dark:text-amber-100 shadow-[0_8px_32px_0_rgba(245,158,11,0.08)]",
                icon: <AlertTriangle className="h-6 w-6 text-amber-500 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/50 p-1 rounded-full shrink-0" />,
                titleClass: "text-amber-950 dark:text-amber-100 font-bold text-lg",
                descClass: "text-amber-800/90 dark:text-amber-300/90 text-sm mb-4 font-medium",
                anomaliesClass: "bg-amber-500/5 dark:bg-amber-950/40 border border-amber-500/10 dark:border-amber-900/30 text-amber-900 dark:text-amber-300 rounded-xl p-3 text-xs mb-4 backdrop-blur-sm",
                scoreClass: "text-3xl font-black text-amber-950 dark:text-amber-100",
                scoreLabelClass: "text-xs text-amber-800/80 dark:text-amber-400/80 font-semibold block mt-0.5",
                blobs: (
                    <>
                        <div className="absolute -right-16 -bottom-16 w-56 h-56 rounded-full bg-amber-400/25 blur-3xl pointer-events-none z-0 animate-glass-blob-1" />
                        <div className="absolute -left-16 -top-16 w-56 h-56 rounded-full bg-orange-300/20 blur-3xl pointer-events-none z-0 animate-glass-blob-2" />
                    </>
                )
            }
        }
        // Healthy (default)
        return {
            cardClass: "bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/20 dark:border-emerald-800/30 text-emerald-950 dark:text-emerald-100 shadow-[0_8px_32px_0_rgba(16,185,129,0.08)]",
            icon: <CheckCircle className="h-6 w-6 text-emerald-500 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/50 p-1 rounded-full shrink-0" />,
            titleClass: "text-emerald-950 dark:text-emerald-100 font-bold text-lg",
            descClass: "text-emerald-800/90 dark:text-emerald-300/90 text-sm mb-4 font-medium",
            anomaliesClass: "bg-emerald-500/5 dark:bg-emerald-950/40 border border-emerald-500/10 dark:border-emerald-900/30 text-emerald-900 dark:text-emerald-300 rounded-xl p-3 text-xs mb-4 backdrop-blur-sm",
            scoreClass: "text-3xl font-black text-emerald-950 dark:text-emerald-100",
            scoreLabelClass: "text-xs text-emerald-800/80 dark:text-emerald-400/80 font-semibold block mt-0.5",
            blobs: (
                <>
                    <div className="absolute -right-16 -bottom-16 w-56 h-56 rounded-full bg-emerald-400/30 blur-3xl pointer-events-none z-0 animate-glass-blob-1" />
                    <div className="absolute -left-16 -top-16 w-56 h-56 rounded-full bg-teal-300/20 blur-3xl pointer-events-none z-0 animate-glass-blob-2" />
                </>
            )
        }
    }

    const s = getStyles()

    return (
        <Card className={cn("border-none overflow-hidden relative transition-all duration-300 hover:shadow-xl backdrop-blur-xl", s.cardClass)}>
            {/* Glossy gradient sheen overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none z-0" />
            
            {/* Ambient Background Glows */}
            {s.blobs}

            <CardContent className="p-6 relative z-10">
                <div className="flex justify-between items-start gap-4">
                    <div>
                        <div className="flex items-center gap-2.5 mb-2">
                            {s.icon}
                            <h3 className={s.titleClass}>{prediction.status}</h3>
                        </div>
                        <p className={s.descClass}>{prediction.recommendation}</p>

                        {prediction.anomalies.length > 0 && (
                            <div className={s.anomaliesClass}>
                                <p className="font-bold mb-1 opacity-80">Detected Anomalies:</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    {prediction.anomalies.map((a: string, i: number) => (
                                        <li key={i}>{a}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="flex items-center gap-6">
                            <div className="text-center">
                                <span className={s.scoreClass}>{prediction.score}</span>
                                <span className={s.scoreLabelClass}>Wellness Score</span>
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

