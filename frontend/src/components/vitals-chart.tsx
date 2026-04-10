
import * as React from "react"
import {
    Area,
    AreaChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    CartesianGrid,
    ReferenceLine,
} from "recharts"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface VitalsData {
    date: string
    weight: number
    height: number
    heartRate: number
    hydration: number
}

export function VitalsChart({ data }: { data: any[] }) {
    const transformedData = React.useMemo(() => {
        if (!data || data.length === 0) return []
        
        return [...data]
            .map(item => ({
                ...item,
                date: item.date || (item.recordedAt ? new Date(item.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown'),
                timestamp: item.recordedAt ? new Date(item.recordedAt).getTime() : 0
            }))
            .sort((a, b) => a.timestamp - b.timestamp)
    }, [data])

    const [metric, setMetric] = React.useState<"weight" | "height" | "heartRate" | "hydration">("weight")

    const config = {
        weight: { label: "Weight", unit: "kg", color: "hsl(var(--chart-1))", gradient: "#f97316" },
        height: { label: "Height", unit: "cm", color: "hsl(var(--chart-2))", gradient: "#22c55e" },
        heartRate: { label: "Heart Rate", unit: "bpm", color: "hsl(var(--destructive))", gradient: "#ef4444" },
        hydration: { label: "Hydration", unit: "ml", color: "hsl(var(--chart-4))", gradient: "#0ea5e9" },
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-xl border border-white/20">
                    <p className="text-xs font-bold text-muted-foreground mb-1">{label}</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold" style={{ color: config[metric].gradient }}>
                            {payload[0].value}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">{config[metric].unit}</span>
                    </div>
                </div>
            )
        }
        return null
    }

    return (
        <Card className="col-span-4 overflow-hidden border-none shadow-none bg-transparent">
            <CardHeader className="px-6 pt-6 pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-xl font-bold tracking-tight">Health Trends</CardTitle>
                        <CardDescription className="text-sm font-medium">
                            Tracking your key vitals over time.
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2 p-1 bg-muted/30 rounded-2xl backdrop-blur-sm self-start sm:self-center">
                        {(Object.keys(config) as Array<keyof typeof config>).map((key) => (
                            <motion.button
                                key={key}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setMetric(key)}
                                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    metric === key 
                                    ? "bg-white text-primary shadow-sm" 
                                    : "text-muted-foreground hover:bg-muted/50"
                                }`}
                            >
                                {config[key].label}
                            </motion.button>
                        ))}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
                <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={transformedData} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={config[metric].gradient} stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor={config[metric].gradient} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                            <XAxis
                                dataKey="date"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={11}
                                fontWeight={600}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={11}
                                fontWeight={600}
                                tickLine={false}
                                axisLine={false}
                                mirror={false}
                                tickFormatter={(val) => `${val}`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey={metric}
                                stroke={config[metric].gradient}
                                strokeWidth={3}
                                strokeLinecap="round"
                                fillOpacity={1}
                                fill="url(#colorMetric)"
                                animationDuration={1000}
                                activeDot={{ r: 6, stroke: 'white', strokeWidth: 2, fill: config[metric].gradient }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
