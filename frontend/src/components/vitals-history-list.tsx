
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, Trash2, Loader2, Save, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { updateVitalLog, deleteVitalLog } from "@/app/actions/health"

interface VitalLog {
    id: string
    weight: number
    height: number
    heartRate: number
    hydration: number
    recordedAt: Date
}

export function VitalsHistoryList({ logs, familyMemberId, onUpdated }: { logs: any[], familyMemberId: string, onUpdated?: () => void }) {
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState<Partial<VitalLog>>({})
    const [loading, setLoading] = useState(false)

    // Parse dates if they are strings (from JSON serialization)
    const formattedLogs = logs.map(log => ({
        ...log,
        recordedAt: new Date(log.recordedAt)
    })).sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime()) // Newest first

    const handleEditClick = (log: any) => {
        setEditingId(log.id)
        setEditForm({
            weight: log.weight,
            height: log.height,
            heartRate: log.heartRate,
            hydration: log.hydration
        })
    }

    const handleCancelEdit = () => {
        setEditingId(null)
        setEditForm({})
    }

    const handleSave = async (id: string) => {
        setLoading(true)
        await updateVitalLog(id, {
            weight: Number(editForm.weight),
            height: Number(editForm.height),
            heartRate: Number(editForm.heartRate),
            hydration: Number(editForm.hydration),
        })
        setLoading(false)
        setEditingId(null)
        if (onUpdated) onUpdated()
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this entry?")) return
        setLoading(true)
        await deleteVitalLog(id)
        setLoading(false)
        if (onUpdated) onUpdated()
    }

    return (
        <Card className="col-span-4 border-none shadow-sm bg-card mt-6">
            <CardHeader>
                <CardTitle>History & Edits</CardTitle>
                <CardDescription>Manage your past vital records.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Weight (kg)</TableHead>
                            <TableHead>Height (cm)</TableHead>
                            <TableHead>Heart Rate (bpm)</TableHead>
                            <TableHead>Hydration (ml)</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {formattedLogs.map((log) => (
                            <TableRow key={log.id}>
                                <TableCell className="font-medium">
                                    {log.recordedAt.toLocaleDateString()} <span className="text-xs text-muted-foreground">{log.recordedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </TableCell>

                                {editingId === log.id ? (
                                    <>
                                        <TableCell><Input type="number" value={editForm.weight} onChange={e => setEditForm({ ...editForm, weight: Number(e.target.value) })} className="h-8 w-20" /></TableCell>
                                        <TableCell><Input type="number" value={editForm.height} onChange={e => setEditForm({ ...editForm, height: Number(e.target.value) })} className="h-8 w-20" /></TableCell>
                                        <TableCell><Input type="number" value={editForm.heartRate} onChange={e => setEditForm({ ...editForm, heartRate: Number(e.target.value) })} className="h-8 w-20" /></TableCell>
                                        <TableCell><Input type="number" value={editForm.hydration} onChange={e => setEditForm({ ...editForm, hydration: Number(e.target.value) })} className="h-8 w-20" /></TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button size="icon" variant="ghost" onClick={() => handleSave(log.id)} disabled={loading}>
                                                    <Save className="h-4 w-4 text-green-600" />
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={handleCancelEdit} disabled={loading}>
                                                    <X className="h-4 w-4 text-red-600" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </>
                                ) : (
                                    <>
                                        <TableCell>{log.weight}</TableCell>
                                        <TableCell>{log.height}</TableCell>
                                        <TableCell>{log.heartRate}</TableCell>
                                        <TableCell>{log.hydration}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button size="icon" variant="ghost" onClick={() => handleEditClick(log)} disabled={loading}>
                                                    <Pencil className="h-4 w-4 opacity-50 hover:opacity-100" />
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={() => handleDelete(log.id)} disabled={loading}>
                                                    <Trash2 className="h-4 w-4 opacity-50 hover:opacity-100 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </>
                                )}
                            </TableRow>
                        ))}
                        {formattedLogs.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                    No records found. Start logging your vitals!
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
