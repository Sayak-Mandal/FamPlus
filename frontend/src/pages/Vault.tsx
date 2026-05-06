/**
 * @file Vault.tsx
 * @description Historical Medical Record Vault for the Famplus platform.
 * Enables users to upload, categorize, and manage clinical records (Prescriptions, Lab Reports).
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Trash2, Download, Search, Plus, Calendar, User, FileDigit } from 'lucide-react';
import { getRecords, uploadRecord, deleteRecord, getFamilyMembers } from '@/app/actions/health';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const CATEGORIES = ['Prescription', 'Lab Report', 'Vaccination', 'Other'];

export default function Vault() {
    const [records, setRecords] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isUploadOpen, setIsUploadOpen] = useState(false);

    // Upload Form State
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("Prescription");
    const [selectedMember, setSelectedMember] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [recordsData, membersData] = await Promise.all([
                getRecords(),
                getFamilyMembers()
            ]);
            setRecords(recordsData);
            setMembers(membersData);
            if (membersData.length > 0) setSelectedMember(membersData[0]._id || membersData[0].id);
        } catch (error) {
            console.error("Failed to fetch vault data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async () => {
        if (!file || !title || !selectedMember) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('title', title);
            formData.append('category', category);
            formData.append('familyMemberId', selectedMember);

            const res = await uploadRecord(formData);
            if (res.success) {
                setIsUploadOpen(false);
                setTitle("");
                setFile(null);
                fetchData();
            }
        } catch (error) {
            console.error("Upload failed", error);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this record?")) return;
        const res = await deleteRecord(id);
        if (res.success) fetchData();
    };

    const filteredRecords = records.filter(r => 
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.familyMemberId?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
                        <FileDigit className="h-10 w-10 text-primary" />
                        Medical Vault
                    </h1>
                    <p className="text-muted-foreground font-medium mt-1">Manage and access historical medical records and prescriptions.</p>
                </div>

                <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                    <DialogTrigger asChild>
                        <Button className="rounded-2xl h-12 px-6 font-bold shadow-lg gap-2">
                            <Plus className="h-5 w-5" />
                            Upload Record
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-[2rem] sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black">Upload Medical Record</DialogTitle>
                            <DialogDescription className="font-medium">
                                Upload a PDF or Image of your prescription or lab report.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="title" className="font-bold">Record Title</Label>
                                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Annual Blood Test" className="rounded-xl" />
                            </div>
                            <div className="grid gap-2">
                                <Label className="font-bold">Family Member</Label>
                                <select 
                                    className="h-10 w-full rounded-xl border border-input px-3 bg-background"
                                    value={selectedMember}
                                    onChange={(e) => setSelectedMember(e.target.value)}
                                >
                                    {members.map(m => (
                                        <option key={m._id || m.id} value={m._id || m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label className="font-bold">Category</Label>
                                <select 
                                    className="h-10 w-full rounded-xl border border-input px-3 bg-background"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                >
                                    {CATEGORIES.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label className="font-bold">File (PDF/Image)</Label>
                                <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="rounded-xl" accept=".pdf,image/*" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleUpload} disabled={uploading || !file || !title} className="rounded-xl w-full h-12 font-bold">
                                {uploading ? "Uploading..." : "Confirm Upload"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="rounded-[2.5rem] border-none shadow-xl bg-card/50 backdrop-blur-md overflow-hidden">
                <CardHeader className="border-b border-border/50 bg-muted/20">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            className="pl-12 h-12 rounded-2xl bg-background/50 border-none focus-visible:ring-primary shadow-inner"
                            placeholder="Search by title, category, or member name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-12 text-center text-muted-foreground font-bold">Loading records...</div>
                    ) : filteredRecords.length === 0 ? (
                        <div className="p-20 text-center space-y-4">
                            <div className="bg-muted/30 h-20 w-20 rounded-full flex items-center justify-center mx-auto">
                                <FileText className="h-10 w-10 text-muted-foreground/50" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">No records found</h3>
                                <p className="text-muted-foreground">Start by uploading your first medical document.</p>
                            </div>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-muted/10">
                                <TableRow className="border-border/50">
                                    <TableHead className="font-black px-6">Record Name</TableHead>
                                    <TableHead className="font-black">Patient</TableHead>
                                    <TableHead className="font-black">Category</TableHead>
                                    <TableHead className="font-black">Date Added</TableHead>
                                    <TableHead className="font-black text-right px-6">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRecords.map((record) => (
                                    <TableRow key={record._id} className="border-border/50 hover:bg-muted/20 transition-colors">
                                        <TableCell className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-primary/10 p-2 rounded-lg">
                                                    <FileText className="h-5 w-5 text-primary" />
                                                </div>
                                                <span className="font-bold text-foreground">{record.title}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-8 w-8 border-2 border-background">
                                                    <AvatarImage src={record.familyMemberId?.avatar} />
                                                    <AvatarFallback className="text-[10px] font-bold">
                                                        {record.familyMemberId?.name.substring(0, 2)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{record.familyMemberId?.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="rounded-lg font-bold bg-primary/5 border-primary/20 text-primary">
                                                {record.category}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground font-medium">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4" />
                                                {new Date(record.createdAt).toLocaleDateString()}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right px-6">
                                            <div className="flex justify-end gap-2">
                                                <Button size="icon" variant="ghost" className="rounded-xl hover:bg-primary/10 text-primary" asChild>
                                                    <a href={record.fileUrl} target="_blank" rel="noopener noreferrer">
                                                        <Download className="h-5 w-5" />
                                                    </a>
                                                </Button>
                                                <Button size="icon" variant="ghost" className="rounded-xl hover:bg-red-500/10 text-red-500" onClick={() => handleDelete(record._id)}>
                                                    <Trash2 className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
