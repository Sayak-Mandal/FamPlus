
import * as React from "react"
import {
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    CartesianGrid,
    Legend,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface VitalsData {
    date: string
    weight: number
    height: number
    heartRate: number
    hydration: number
}

export function VitalsChart({ data }: { data: VitalsData[] }) {
    const [metric, setMetric] = React.useState<"weight" | "height" | "heartRate" | "hydration">("weight")

    const config = {
        weight: { label: "Weight (kg)", color: "#2563eb" }, // blue
        height: { label: "Height (cm)", color: "#16a34a" }, // green
        heartRate: { label: "Heart Rate (bpm)", color: "#dc2626" }, // red
        hydration: { label: "Hydration (ml)", color: "#0ea5e9" }, // sky
    }

    return (
        <Card className="col-span-4 overflow-hidden border-none shadow-none bg-transparent">
            <CardHeader>
                <CardTitle>Health Trends</CardTitle>
                <CardDescription>
                    Tracking your key vitals over time.
                </CardDescription>
                <div className="flex gap-2 pt-2">
                    {(Object.keys(config) as Array<keyof typeof config>).map((key) => (
                        <Button
                            key={key}
                            variant={metric === key ? "default" : "outline"}
                            size="sm"
                            onClick={() => setMetric(key)}
                            className="capitalize"
                        >
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                        </Button>
                    ))}
                </div>
            </CardHeader>
            <CardContent className="pl-2">
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                            />
                            <Line
                                type="monotone"
                                dataKey={metric}
                                stroke={config[metric].color}
                                strokeWidth={2}
                                activeDot={{ r: 4 }}
                                name={config[metric].label}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
