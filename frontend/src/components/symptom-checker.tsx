/**
 * @file symptom-checker.tsx
 * @description Core diagnostic interface for the Famplus ecosystem.
 * Fuses React 19 UI with a Python-based AI microservice to provide
 * vitals-aware symptom analysis and clinical-grade PDF reporting.
 */

import React, { useState } from 'react'
import { predictCondition, VitalsContext } from '@/services/ai-model'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Sparkles, AlertTriangle, ArrowRight, Bot, MapPin, Stethoscope, ShieldCheck, ListChecks, Activity, HeartPulse, Clock, CheckCircle2, Download } from 'lucide-react'
import { getFamilyMembers, logSymptom } from '@/app/actions/health'
import { Link } from "react-router-dom";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * 🏥 SymptomChecker Component
 * ------------------------------------------------------------------------------
 * The primary interface for the Famplus AI Diagnostic System.
 * 
 * Features:
 * - Multi-member selection for context-aware diagnosis.
 * - Real-time vitals freshness validation.
 * - Integrated health insights via Python AI Engine + Gemma3 LLM.
 * - Health report generation via jsPDF.
 * 
 * @component
 */

/**
 * Maximum age (in minutes) before dashboard vitals are considered stale.
 */
const VITALS_FRESHNESS_LIMIT = 180; // 3 hours


export function SymptomChecker() {
    const [symptoms, setSymptoms] = useState("")
    const [result, setResult] = useState<{ 
        condition: string; 
        confidence: number; 
        advice: string; 
        specialist: string;
        description?: string;
        precautions?: string[];
        urgency?: string;
        disclaimer?: string;
        top_matches?: { condition: string; confidence: number }[];
        next_steps?: string[];
        vitals_analysis?: string[];
    } | null>(null)
    const [loading, setLoading] = useState(false)
    const [members, setMembers] = useState<any[]>([])
    const [selectedMember, setSelectedMember] = useState("")
    const [vitalsStatus, setVitalsStatus] = useState<'fresh' | 'stale' | 'none'>('none')

    React.useEffect(() => {
        const fetchMembers = async () => {
            try {
                const userId = localStorage.getItem('userId') || "";
                const data = await getFamilyMembers(userId)
                if (Array.isArray(data)) {
                    setMembers(data)
                    if (data.length > 0) setSelectedMember(data[0]._id || data[0].id)
                }
            } catch (e) {
                console.error("Failed to load family members")
            }
        }
        fetchMembers()
    }, [])

    // Compute vitals freshness whenever selected member changes
    const selectedMemberData = members.find(m => (m._id || m.id) === selectedMember)
    
    React.useEffect(() => {
        if (!selectedMemberData) {
            setVitalsStatus('none')
            return
        }
        const updatedAt = selectedMemberData.updatedAt
        if (!updatedAt) {
            setVitalsStatus('none')
            return
        }
        const ageMinutes = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 60000)
        setVitalsStatus(ageMinutes <= VITALS_FRESHNESS_LIMIT ? 'fresh' : 'stale')
    }, [selectedMember, selectedMemberData])

    /**
     * Build a VitalsContext from the selected member's dashboard data.
     * Returns undefined if no member is selected or vitals are stale.
     */
    const buildVitalsContext = (): VitalsContext | undefined => {
        if (!selectedMemberData) return undefined

        const updatedAt = selectedMemberData.updatedAt
        if (!updatedAt) return undefined

        const ageMinutes = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 60000)

        // Always send the context — the backend will decide if it's fresh enough.
        // This way the backend can still return a "data too old" message in vitals_analysis.
        return {
            heart_rate:       selectedMemberData.heartRate || undefined,
            blood_pressure:   selectedMemberData.bloodPressure || undefined,
            sleep:            selectedMemberData.sleep || undefined,
            age:              selectedMemberData.age || undefined,
            data_age_minutes: ageMinutes,
        }
    }

    /**
     * Triggers the AI analysis pipeline.
     * Fetches vitals context, calls the inference engine, and logs the encounter.
     */
    const handleAnalyze = async () => {
        if (!symptoms.trim()) return;
        setLoading(true);
        try {
            const vitalsContext = buildVitalsContext();
            const prediction = await predictCondition(symptoms, vitalsContext);
            setResult(prediction);

            // Log to Database if member selected
            if (selectedMember && prediction.condition !== "Service Unavailable" && prediction.condition !== "Unspecific Indications") {
                await logSymptom(
                    selectedMember,
                    symptoms,
                    `${prediction.condition}: ${prediction.description || prediction.advice}`,
                    prediction.urgency === 'High' ? 'Emergency' : 'Safe'
                );
            }

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    /**
     * Generates a professional health report in PDF format.
     * Incorporates patient data, vitals snapshots, and AI-driven clinical guidance.
     */
    const handleDownloadPDF = () => {
        if (!result) return;
        
        const doc = new jsPDF();
        
        // Brand Header
        doc.setFillColor(15, 23, 42); // slate-900 (Famplus brand dark)
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text("FAMPLUS HEALTH", 14, 20);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text("AI Diagnostic Support Engine - Preliminary Report", 14, 28);
        
        const date = new Date().toLocaleString();
        doc.text(`Generated: ${date}`, 14, 34);

        // Reset text color for body
        doc.setTextColor(0, 0, 0);

        let yPos = 50;
        
        // Patient Context
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("Patient Information", 14, yPos);
        yPos += 8;
        
        const patientName = selectedMemberData?.name || "Anonymous User";
        
        autoTable(doc, {
            startY: yPos,
            body: [
                ['Patient Name', patientName],
                ['Reported Symptoms', symptoms]
            ],
            theme: 'plain',
            styles: { fontSize: 10, cellPadding: 2 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
        });
        
        // @ts-ignore
        yPos = doc.lastAutoTable.finalY + 15;

        // Vitals
        if (selectedMemberData && vitalsStatus === 'fresh') {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text("Recorded Vitals", 14, yPos);
            yPos += 8;

            const vitalsBody = [];
            if (selectedMemberData.heartRate) vitalsBody.push(['Heart Rate', `${selectedMemberData.heartRate} bpm`]);
            if (selectedMemberData.bloodPressure) vitalsBody.push(['Blood Pressure', `${selectedMemberData.bloodPressure} mmHg`]);
            if (selectedMemberData.sleep) vitalsBody.push(['Sleep (Last Night)', `${selectedMemberData.sleep}`]);

            if (vitalsBody.length > 0) {
                autoTable(doc, {
                    startY: yPos,
                    body: vitalsBody,
                    theme: 'plain',
                    styles: { fontSize: 10, cellPadding: 2 },
                    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
                });
                // @ts-ignore
                yPos = doc.lastAutoTable.finalY + 15;
            }
        }

        // AI Assessment
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("AI Assessment", 14, yPos);
        yPos += 8;
        
        autoTable(doc, {
            startY: yPos,
            body: [
                ['Condition Match', result.condition],
                ['Confidence', `${result.confidence}%`],
                ['Urgency Level', result.urgency || 'Normal'],
                ['Recommended Specialist', result.specialist || 'General Physician']
            ],
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] },
            styles: { fontSize: 11, cellPadding: 4 }
        });
        
        // @ts-ignore
        yPos = doc.lastAutoTable.finalY + 15;

        // Advice
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("Clinical Guidance", 14, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const splitAdvice = doc.splitTextToSize(result.advice, 180);
        doc.text(splitAdvice, 14, yPos);
        yPos += splitAdvice.length * 5 + 10;
        
        // Precautions/Next Steps
        const listItems = (result.precautions && result.precautions.length > 0) ? result.precautions : result.next_steps;
        if (listItems && listItems.length > 0) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text("Recommendations:", 14, yPos);
            yPos += 8;
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            listItems.forEach(item => {
                const lines = doc.splitTextToSize(`• ${item}`, 180);
                doc.text(lines, 14, yPos);
                yPos += lines.length * 5 + 2;
            });
        }

        // WARNING FOOTER
        const pageHeight = doc.internal.pageSize.height;
        doc.setTextColor(220, 38, 38); // red-600
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        const warningText = "WARNING: This report was generated by an Artificial Intelligence engine and is NOT a definitive medical diagnosis. It is intended for informational purposes only. Please present this document to a qualified medical professional for proper clinical evaluation and diagnosis.";
        const splitWarning = doc.splitTextToSize(warningText, 180);
        doc.text(splitWarning, 14, pageHeight - 15);
        
        doc.save(`Famplus_Health_Report_${patientName.replace(/\s+/g, '_')}.pdf`);
    };

    return (
        <Card className="w-full border-none shadow-sm bg-card overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-3">
                <Bot className="w-64 h-64 text-primary" />
            </div>

            <CardHeader className="pb-4 z-10 relative">
                <CardTitle className="flex items-center gap-3 text-2xl font-bold">
                    <div className="p-2 bg-primary/10 rounded-xl">
                        <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    AI Diagnostic System
                </CardTitle>
                <CardDescription className="text-base mt-2 font-medium">
                    Analyze symptoms using our trained medical diagnostic model with grounding context.
                    <span className="block mt-2 text-[10px] uppercase tracking-tighter font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 dark:bg-orange-500/20 px-3 py-1 rounded-full w-fit">
                        ⚠️ Consult a professional GP for definitive diagnosis
                    </span>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-2 z-10 relative">
                <div className="flex flex-col md:flex-row gap-6 md:gap-4">
                    <div className="md:w-1/3">
                        <select
                            className="h-14 w-full px-4 rounded-2xl bg-muted/30 border-input focus:ring-primary border text-lg font-medium transition-all hover:bg-muted/50"
                            value={selectedMember}
                            onChange={(e) => setSelectedMember(e.target.value)}
                        >
                            <option value="" disabled>Select Family Member</option>
                            {members.map(m => (
                                <option key={m._id || m.id} value={m._id || m.id}>{m.name}</option>
                            ))}
                        </select>
                        {/* Vitals Status Indicator */}
                        {selectedMemberData && (
                            <div className={`mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold w-fit transition-all ${
                                vitalsStatus === 'fresh' 
                                    ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                                    : vitalsStatus === 'stale'
                                        ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                        : 'bg-muted text-muted-foreground'
                            }`}>
                                {vitalsStatus === 'fresh' ? (
                                    <>
                                        <HeartPulse className="h-3 w-3" />
                                        Live vitals active
                                        {selectedMemberData.heartRate > 0 && (
                                            <span className="opacity-70">• {selectedMemberData.heartRate} bpm</span>
                                        )}
                                    </>
                                ) : vitalsStatus === 'stale' ? (
                                    <>
                                        <Clock className="h-3 w-3" />
                                        Vitals outdated — symptom-only mode
                                    </>
                                ) : (
                                    <>
                                        <Activity className="h-3 w-3" />
                                        No vitals data
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="relative flex-1">
                        <Input
                            className="h-14 text-lg px-6 rounded-2xl bg-muted/30 border-input focus-visible:ring-primary w-full transition-all hover:bg-muted/50"
                            placeholder="Describe symptoms (e.g., headache, fever...)"
                            value={symptoms}
                            onChange={(e) => setSymptoms(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                        />
                    </div>
                    <Button
                        onClick={handleAnalyze}
                        disabled={loading || !symptoms.trim()}
                        className="h-14 px-8 rounded-2xl font-bold text-lg shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
                    >
                        {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ArrowRight className="h-6 w-6" />}
                    </Button>
                </div>

                {result && (
                    <div className="mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Result Card */}
                            <div className="bg-muted/30 p-8 rounded-[2rem] space-y-6 border border-border/50 backdrop-blur-sm relative overflow-hidden">
                                <div className="space-y-2">
                                    <p className="text-xs font-black text-primary uppercase tracking-[0.2em]">Possible Indications</p>
                                    <h3 className="text-3xl font-black text-foreground tracking-tight leading-none">{result.condition}</h3>
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <span className="text-sm font-bold text-muted-foreground uppercase">Primary Fit</span>
                                        <span className="text-2xl font-black tabular-nums">{result.confidence}%</span>
                                    </div>
                                    <div className="h-3 w-full bg-border/20 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(var(--primary),0.6)]"
                                            style={{ width: `${result.confidence}%` }}
                                        />
                                    </div>
                                </div>

                                {result.top_matches && result.top_matches.length > 1 && (
                                    <div className="pt-6 border-t border-border/50 space-y-4">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Potential Comparisons</p>
                                        <div className="space-y-3">
                                            {result.top_matches.map((match, idx) => (
                                                <div key={idx} className="flex items-center gap-3">
                                                    <div className="w-full bg-muted/50 h-8 px-4 rounded-xl flex items-center justify-between border border-border/20">
                                                        <span className={`text-[13px] font-bold ${idx === 0 ? 'text-primary' : 'text-foreground/70'}`}>
                                                            {idx + 1}. {match.condition}
                                                        </span>
                                                        <span className="text-[11px] font-black opacity-80">{match.confidence}%</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Action/Urgency Card */}
                            <div className={`p-8 rounded-[2rem] border-2 space-y-6 transition-all duration-500 shadow-xl ${result.urgency === 'High'
                                ? 'bg-red-500/5 border-red-500/50 shadow-red-500/10'
                                : 'bg-primary/5 border-primary/20 shadow-primary/5'
                                }`}>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        {result.urgency === 'High' ? (
                                            <div className="bg-red-500 text-white p-1.5 rounded-lg animate-pulse">
                                                <AlertTriangle className="h-5 w-5" />
                                            </div>
                                        ) : (
                                            <div className="bg-primary text-white p-1.5 rounded-lg">
                                                <Activity className="h-5 w-5" />
                                            </div>
                                        )}
                                        <p className={`text-xs font-black uppercase tracking-[0.2em] ${result.urgency === 'High' ? 'text-red-500' : 'text-primary'}`}>
                                            {result.urgency === 'High' ? 'Immediate Attention Required' : 'Standard Guidance'}
                                        </p>
                                    </div>
                                    
                                    <p className="text-xl font-bold leading-tight">
                                        {result.advice}
                                    </p>

                                    {result.specialist !== "N/A" && (
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Recommended Specialist: <span className="text-foreground font-bold">{result.specialist}</span>
                                        </p>
                                    )}
                                </div>

                                {((result.precautions && result.precautions.length > 0) || (result.next_steps && result.next_steps.length > 0)) && (
                                    <div className="space-y-3 p-5 bg-background/50 rounded-3xl border border-border/50">
                                        <div className="flex items-center gap-2 mb-1">
                                            {result.precautions && result.precautions.length > 0 ? (
                                                <ShieldCheck className="h-4 w-4 text-primary" />
                                            ) : (
                                                <ListChecks className="h-4 w-4 text-primary" />
                                            )}
                                            <p className="text-[10px] font-black uppercase tracking-tighter text-primary">
                                                {result.precautions && result.precautions.length > 0 ? "Standard Precautions" : "Suggested Next Steps"}
                                            </p>
                                        </div>
                                        <ul className="space-y-2">
                                            {(result.precautions && result.precautions.length > 0 ? result.precautions : result.next_steps)?.map((item, i) => (
                                                <li key={i} className="text-sm font-bold flex items-center gap-2">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="flex flex-col gap-3">
                                    <Button
                                        className={`w-full h-14 rounded-2xl gap-3 text-lg font-black tracking-tight ${result.urgency === 'High' ? 'bg-red-500 hover:bg-red-600 text-white' : ''}`}
                                        asChild
                                    >
                                        <Link to={`/find-care?symptoms=${encodeURIComponent(symptoms)}`}>
                                            <MapPin className="h-5 w-5" />
                                            {result.urgency === 'High' ? 'Find Emergency Care' : `Locate ${result.specialist || 'General Physician'}`}
                                        </Link>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="w-full h-14 rounded-2xl gap-3 text-lg font-bold border-2 bg-background hover:bg-muted text-foreground"
                                        onClick={handleDownloadPDF}
                                    >
                                        <Download className="h-5 w-5" />
                                        Download AI Report (PDF)
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Vitals Analysis Section — NEW */}
                        {result.vitals_analysis && result.vitals_analysis.length > 0 && (
                            <div className="bg-muted/20 p-8 rounded-[2rem] border border-border/50">
                                <div className="flex items-center gap-2 mb-4">
                                    <HeartPulse className="h-5 w-5 text-primary" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/80">
                                        Dashboard Vitals Analysis
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    {result.vitals_analysis.map((analysis, i) => (
                                        <div key={i} className="flex items-start gap-2.5 text-sm font-medium text-foreground/80 leading-relaxed">
                                            <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary/60 shrink-0" />
                                            <span>{analysis}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Description Section */}
                        {result.description && (
                            <div className="bg-muted/20 p-8 rounded-[2rem] border border-border/50">
                                <div className="space-y-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">About this Indication</p>
                                    <p className="text-sm leading-relaxed text-foreground/80 font-medium italic">
                                        "{result.description}"
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Disclaimer Footer */}
                        {result.disclaimer && (
                            <div className="bg-muted/10 p-5 rounded-2xl border border-border/50 flex items-start gap-4">
                                <ShieldCheck className="h-6 w-6 text-primary/60 mt-0.5" />
                                <p className="text-[11px] font-medium text-muted-foreground leading-relaxed italic">
                                    {result.disclaimer}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card >
    )
}
