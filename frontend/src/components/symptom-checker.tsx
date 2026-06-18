/**
 * @file symptom-checker.tsx
 * @description Core diagnostic interface for the Famplus ecosystem.
 * Fuses React 19 UI with a Python-based AI microservice to provide
 * vitals-aware symptom analysis and clinical-grade PDF reporting.
 */

import React, { useState } from 'react'
import { analyzeAndLogSymptom } from '@/app/actions/health'
import { useFamilyContext } from '@/app/family-context'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Sparkles, AlertTriangle, ArrowRight, Bot, MapPin, Stethoscope, ShieldCheck, ListChecks, Activity, HeartPulse, Clock, CheckCircle2, Download, Mic, MicOff, Eye, FileText, RotateCcw, ChevronDown } from 'lucide-react'
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition'

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
    // --------------------------------------------------------------------------
    // STATE MANAGEMENT & PERSISTENCE
    // --------------------------------------------------------------------------
    // We use sessionStorage to ensure the user doesn't lose their diagnostic 
    // progress if they navigate to other tabs (like 'Find Care') and return.
    const [symptoms, setSymptoms] = useState(() => sessionStorage.getItem('famplus_ai_symptoms') || "")
    const { isListening, toggleListening, stopListening, isSupported, interimTranscript } = useSpeechRecognition()
    
    // Result object mapped exactly to the expected Python AI response schema.
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
    } | null>(() => {
        const saved = sessionStorage.getItem('famplus_ai_result');
        if (saved) {
            try { return JSON.parse(saved); } catch(e) {}
        }
        return null;
    })
    const { familyMembers: members, selectedMemberId: contextSelectedMemberId, setSelectedMemberId: setContextSelectedMemberId } = useFamilyContext()
    const [loading, setLoading] = useState(false)
    const [selectedMember, setSelectedMemberLocal] = useState(() => sessionStorage.getItem('famplus_ai_member') || "")
    const [vitalsStatus, setVitalsStatus] = useState<'fresh' | 'stale' | 'none'>('none')
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState("");

    /**
     * Unified setter: updates both local state and the global FamilyContext
     * so that member selection on this page propagates back to Dashboard.
     */
    const setSelectedMember = (id: string) => {
        setSelectedMemberLocal(id);
        setContextSelectedMemberId(id);
        sessionStorage.setItem('famplus_ai_member', id);
    };

    // Sync local selection whenever the Dashboard (or any page) changes the global context member.
    React.useEffect(() => {
        if (contextSelectedMemberId && contextSelectedMemberId !== selectedMember) {
            setSelectedMemberLocal(contextSelectedMemberId);
            sessionStorage.setItem('famplus_ai_member', contextSelectedMemberId);
        }
    }, [contextSelectedMemberId]);

    // If no local selection yet but context has one, initialize from context.
    React.useEffect(() => {
        if (!selectedMember && contextSelectedMemberId) {
            setSelectedMemberLocal(contextSelectedMemberId);
        } else if (!selectedMember && members.length > 0) {
            const firstId = members[0]._id || members[0].id;
            setSelectedMemberLocal(firstId);
            setContextSelectedMemberId(firstId);
        }
    }, [members, contextSelectedMemberId]);

    React.useEffect(() => {
        if (!isPreviewOpen && previewUrl) {
            window.URL.revokeObjectURL(previewUrl);
            setPreviewUrl("");
        }
    }, [isPreviewOpen, previewUrl]);

    // Sync session state whenever core dependencies change to prevent data loss.
    React.useEffect(() => {
        sessionStorage.setItem('famplus_ai_symptoms', symptoms);
    }, [symptoms]);

    React.useEffect(() => {
        if (result) {
            sessionStorage.setItem('famplus_ai_result', JSON.stringify(result));
        } else {
            sessionStorage.removeItem('famplus_ai_result');
        }
    }, [result]);

    /**
     * Resets the entire diagnostic interface, clearing local state and purging
     * the sessionStorage cache so the user can start a fresh analysis.
     */
    const handleReset = () => {
        setSymptoms("");
        setResult(null);
        if (members.length > 0) {
            const firstId = members[0]._id || members[0].id;
            setSelectedMember(firstId);
        } else {
            setSelectedMemberLocal("");
        }
        sessionStorage.removeItem('famplus_ai_symptoms');
        sessionStorage.removeItem('famplus_ai_result');
        sessionStorage.removeItem('famplus_ai_member');
    };

    // Compute vitals freshness whenever selected member changes
    const selectedMemberData = members.find(m => (m._id || m.id) === selectedMember)
    
    React.useEffect(() => {
        if (!selectedMemberData) {
            setVitalsStatus('none')
            return
        }
        // Use latestVitalAt — the actual recordedAt of the most recent VitalLog entry.
        // FamilyMember.updatedAt reflects document edits (e.g. seeding), NOT vital logging.
        const latestVitalAt = selectedMemberData.latestVitalAt
        if (!latestVitalAt) {
            setVitalsStatus('none')
            return
        }
        const ageMinutes = Math.floor((Date.now() - new Date(latestVitalAt).getTime()) / 60000)
        setVitalsStatus(ageMinutes <= VITALS_FRESHNESS_LIMIT ? 'fresh' : 'stale')
    }, [selectedMember, selectedMemberData])


    /**
     * Triggers the AI analysis pipeline via the Node.js backend proxy.
     * The backend fetches the member's vitals context automatically and
     * logs the encounter to MongoDB — no direct Python AI calls needed.
     */
    const handleAnalyze = async () => {
        if (!symptoms.trim()) return;
        if (!selectedMember) {
            alert('Please select a family member first.');
            return;
        }
        setLoading(true);
        try {
            const response = await analyzeAndLogSymptom(selectedMember, symptoms);
            if (response.success && response.data) {
                setResult(response.data);
            } else {
                console.error('AI analysis failed:', response.error);
                setResult({
                    condition: 'Service Unavailable',
                    confidence: 0,
                    advice: 'Unable to connect to the AI engine. Please ensure all services are running.',
                    specialist: 'General Physician',
                    urgency: 'Normal',
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    /**
     * Generates a professional health report in PDF format using jsPDF.
     * 
     * Complexities Handled:
     * 1. PDF font rendering corruption (sanitization of smart quotes/emojis).
     * 2. Auto-pagination and careful yPos tracking to ensure content fits.
     * 3. Dynamic vitals inclusion (only appended if fresh).
     * 
     * @returns {Object|null} The generated jsPDF instance and the parsed patient name.
     */
    const generatePDFDoc = () => {
        if (!result) return null;
        
        const doc = new jsPDF();

        // Helper to format text with proper grammatical rules (Sentence case and punctuation)
        const formatFormalText = (text: string | undefined | null) => {
            if (!text) return '';
            let formatted = text.trim();
            // Capitalize first letter of every sentence
            formatted = formatted.replace(/(^\s*|[.!?]\s+)([a-z])/g, (match, separator, letter) => {
                return separator + letter.toUpperCase();
            });
            // Ensure sentences end with a period if they don't already (skip short phrases)
            if (!/[.!?]$/.test(formatted) && formatted.length > 10) {
                formatted += '.';
            }
            return formatted;
        };

        // Helper to sanitize text for jsPDF's standard fonts to prevent PDF corruption
        const sanitizeText = (text: string | undefined | null) => {
            if (!text) return '';
            return text
                .replace(/[\u2018\u2019]/g, "'") // smart single quotes
                .replace(/[\u201C\u201D]/g, '"') // smart double quotes
                .replace(/[\u2013\u2014]/g, '-') // en and em dashes
                .replace(/[\u2026]/g, '...') // ellipsis
                .replace(/[^\x20-\x7E]/g, ''); // strip remaining non-ASCII chars (emojis, etc.)
        };

        const processText = (text: string | undefined | null) => sanitizeText(formatFormalText(text));
        
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
        
        const date = new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toUpperCase();
        doc.text(`Generated: ${date}`, 14, 34);

        // Reset text color for body
        doc.setTextColor(0, 0, 0);

        let yPos = 46;
        
        // Patient Context
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("Patient Information", 14, yPos);
        yPos += 6;
        
        const patientName = selectedMemberData?.name || "Anonymous User";
        
        autoTable(doc, {
            startY: yPos,
            body: [
                ['Patient Name', sanitizeText(patientName)],
                ['Reported Symptoms', processText(symptoms)]
            ],
            theme: 'plain',
            styles: { fontSize: 10, cellPadding: 2 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
        });
        
        // @ts-ignore
        yPos = doc.lastAutoTable.finalY + 10;

        // Vitals - Only include if data exists and is fresh (< 3 hours)
        if (selectedMemberData && vitalsStatus === 'fresh') {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text("Patient Vitals", 14, yPos);
            yPos += 6;

            const vitalsBody = [];
            if (selectedMemberData.heartRate) vitalsBody.push(['Heart Rate', `${selectedMemberData.heartRate} bpm`]);
            if (selectedMemberData.bloodPressure) vitalsBody.push(['Blood Pressure', `${sanitizeText(selectedMemberData.bloodPressure)} mmHg`]);
            if (selectedMemberData.sleep) vitalsBody.push(['Sleep (Last Night)', sanitizeText(selectedMemberData.sleep)]);
            
            // Add Timestamp for Reliability
            if (selectedMemberData.latestVitalAt) {
                const recordedAt = new Date(selectedMemberData.latestVitalAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toUpperCase();
                vitalsBody.push(['Vitals Taken At', sanitizeText(recordedAt)]);
            }

            if (vitalsBody.length > 0) {
                autoTable(doc, {
                    startY: yPos,
                    body: vitalsBody,
                    theme: 'plain',
                    styles: { fontSize: 10, cellPadding: 2 },
                    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
                });
                // @ts-ignore
                yPos = doc.lastAutoTable.finalY + 10;
            }
        }

        // AI Assessment
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("AI Assessment", 14, yPos);
        yPos += 6;
        
        autoTable(doc, {
            startY: yPos,
            body: [
                ['Condition Match', processText(result.condition)],
                ['Confidence', `${result.confidence}%`],
                ['Urgency Level', processText(result.urgency || 'Normal')],
                ['Recommended Specialist', processText(result.specialist || 'General Physician')]
            ],
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] },
            styles: { fontSize: 11, cellPadding: 4 }
        });
        
        // @ts-ignore
        yPos = doc.lastAutoTable.finalY + 10;

        // Advice
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("Clinical Guidance", 14, yPos);
        yPos += 6;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const splitAdvice = doc.splitTextToSize(processText(result.advice), 180);
        doc.text(splitAdvice, 14, yPos);
        yPos += splitAdvice.length * 5 + 6;
        
        // Precautions/Next Steps
        const listItems = (result.precautions && result.precautions.length > 0) ? result.precautions : result.next_steps;
        if (listItems && listItems.length > 0) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text("Recommendations:", 14, yPos);
            yPos += 6;
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            listItems.forEach(item => {
                const lines = doc.splitTextToSize(`• ${sanitizeText(item)}`, 180);
                doc.text(lines, 14, yPos);
                yPos += lines.length * 5 + 1;
            });
        }

        // WARNING FOOTER — always on the same page, anchored near the bottom
        const pageHeight = doc.internal.pageSize.height;
        doc.setTextColor(220, 38, 38); // red-600
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        const warningText = "IMPORTANT DISCLAIMER: This AI-generated report is for informational purposes only and does not constitute a medical diagnosis. Please consult a qualified healthcare professional for clinical evaluation.";
        const splitWarning = doc.splitTextToSize(warningText, 180);
        
        // Determine warning position: anchor near bottom if possible, but stay at least 8 units below content
        let warningY = yPos + 8;
        
        if (warningY < pageHeight - 12) {
            warningY = pageHeight - 12; // anchor to bottom
        } else if (warningY > pageHeight - 6) {
            doc.addPage(); // only break page if it literally falls off the paper
            warningY = pageHeight - 12;
        }

        doc.setDrawColor(220, 38, 38);
        doc.setLineWidth(0.3);
        doc.line(14, warningY - 4, 196, warningY - 4);
        doc.text(splitWarning, 14, warningY);
        
        return { doc, patientName };
    };

    const handleDownloadPDF = () => {
        const generated = generatePDFDoc();
        if (!generated) return;
        const safeName = generated.patientName.replace(/[^a-zA-Z0-9_-]/g, '_');
        generated.doc.save(`Famplus_Health_Report_${safeName}.pdf`);
    };

    const handlePreviewPDF = () => {
        const generated = generatePDFDoc();
        if (!generated) return;
        const blob = generated.doc.output('blob');
        const url = window.URL.createObjectURL(blob);
        setPreviewUrl(url);
        setIsPreviewOpen(true);
    };

    return (
        <Card className="w-full border-none shadow-sm bg-card overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-3">
                <Bot className="w-64 h-64 text-primary" />
            </div>

            <CardHeader className="pb-4 z-10 relative">
                <CardTitle className="flex items-center justify-between text-2xl font-bold">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <Sparkles className="h-6 w-6 text-primary" />
                        </div>
                        AI Diagnostic System
                    </div>
                    {(result || symptoms) && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleReset}
                            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Reset
                        </Button>
                    )}
                </CardTitle>
                <CardDescription className="text-base mt-2 font-medium">
                    Analyze symptoms using our trained medical diagnostic model with grounding context.
                    <span className="block mt-2 text-[10px] uppercase tracking-tighter font-bold text-red-600 dark:text-red-400 bg-red-500/10 dark:bg-red-500/20 px-3 py-1 rounded-full w-fit">
                        Consult a professional General Physician for definitive diagnosis
                    </span>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-2 z-10 relative">
                <div className="flex flex-col md:flex-row items-start gap-6 md:gap-4 w-full">
                    <div className="md:w-1/3 relative">
                        <select
                            className="h-14 w-full pl-4 pr-10 rounded-2xl bg-muted/30 border-input focus:ring-primary border text-lg font-medium transition-all hover:bg-muted/50 appearance-none cursor-pointer"
                            value={selectedMember}
                            onChange={(e) => setSelectedMember(e.target.value)}
                        >
                            <option value="" disabled>Select Family Member</option>
                            {members.map(m => (
                                <option key={m._id || m.id} value={m._id || m.id}>{m.name}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        </div>
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
                                        <span className="opacity-70 ml-1">
                                            {(() => {
                                                const ageMin = Math.floor((Date.now() - new Date(selectedMemberData.latestVitalAt).getTime()) / 60000);
                                                if (ageMin < 60) return `(${ageMin}m ago)`;
                                                const ageHr = Math.floor(ageMin / 60);
                                                const remMin = ageMin % 60;
                                                return remMin > 0 ? `(${ageHr}h ${remMin}m ago)` : `(${ageHr}h ago)`;
                                            })()}
                                        </span>
                                        {selectedMemberData.heartRate > 0 && (
                                            <span className="opacity-70 ml-1">• {selectedMemberData.heartRate} bpm</span>
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
                    <div className="flex-1 w-full">
                        <div className="relative w-full h-14">
                            <Input
                                className="h-14 text-lg pl-6 pr-14 rounded-2xl bg-muted/30 border-input focus-visible:ring-primary w-full transition-all hover:bg-muted/50"
                                placeholder="Describe symptoms (e.g., headache, fever...)"
                                value={symptoms}
                                onChange={(e) => setSymptoms(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                            />
                            {/* WhatsApp-style Speech Recognition Overlay */}
                            {isListening && (
                                <div className="absolute inset-0.5 bg-background/95 backdrop-blur-md rounded-2xl flex items-center justify-between px-6 animate-in fade-in slide-in-from-left-2 duration-300 z-10 border border-red-500/20">
                                    <div className="flex items-center gap-3 w-full max-w-[75%] overflow-hidden">
                                        <div className="flex items-center justify-center w-5 h-5 relative shrink-0">
                                            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                                        </div>
                                        <span className="text-red-600 dark:text-red-400 text-sm font-semibold tracking-wide animate-pulse shrink-0">
                                            Listening...
                                        </span>
                                        
                                        {/* Bouncing Audio Wave Visual */}
                                        <div className="flex items-end gap-1 h-5 px-2 shrink-0">
                                            <div className="w-1 h-3 bg-red-500 rounded-full origin-bottom animate-wave-1" />
                                            <div className="w-1 h-5 bg-red-500 rounded-full origin-bottom animate-wave-2" />
                                            <div className="w-1 h-4 bg-red-500 rounded-full origin-bottom animate-wave-3" />
                                            <div className="w-1 h-2 bg-red-500 rounded-full origin-bottom animate-wave-4" />
                                        </div>

                                        {/* Live Text Preview */}
                                        {interimTranscript && (
                                            <div className="ml-2 pl-3 border-l border-red-500/30 truncate text-sm font-medium text-foreground/80 flex-1">
                                                {interimTranscript}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <button
                                        type="button"
                                        onClick={stopListening}
                                        className="text-muted-foreground hover:text-foreground text-xs font-bold transition-all px-3 py-1.5 hover:bg-muted rounded-xl mr-8"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}

                            {isSupported && (
                                <button
                                    type="button"
                                    onClick={() => toggleListening((text) => setSymptoms(prev => prev ? `${prev.trim()} ${text}` : text))}
                                    className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all duration-300 z-20 ${
                                        isListening 
                                            ? 'bg-red-500/10 text-red-500 animate-pulse border border-red-500/30' 
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                    }`}
                                    title={isListening ? "Stop listening" : "Add symptoms using voice"}
                                    aria-label={isListening ? "Stop voice input" : "Start voice input"}
                                >
                                    {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                                </button>
                            )}
                        </div>
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
                                    <h3 className="text-3xl font-black text-foreground tracking-tight leading-none">
                                        {result.condition === 'Top_Matches' ? 'Complex Indication' : result.condition.replace(/_/g, ' ')}
                                    </h3>
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
                            <div className={`p-8 rounded-[2rem] border-2 space-y-6 transition-all duration-500 shadow-xl ${
                                result.urgency === 'Emergency'
                                    ? 'bg-red-500/10 border-red-500/50 shadow-red-500/20'
                                    : result.urgency === 'High'
                                    ? 'bg-red-500/10 border-red-500/50 shadow-red-500/10'
                                    : 'bg-primary/5 border-primary/20 shadow-primary/5'
                                }`}>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        {result.urgency === 'Emergency' ? (
                                            <div className="bg-red-500 text-white p-1.5 rounded-lg animate-pulse shadow-lg shadow-red-500/50">
                                                <AlertTriangle className="h-5 w-5" />
                                            </div>
                                        ) : result.urgency === 'High' ? (
                                            <div className="bg-red-500 text-white p-1.5 rounded-lg shadow-lg shadow-red-500/30">
                                                <AlertTriangle className="h-5 w-5" />
                                            </div>
                                        ) : (
                                            <div className="bg-primary text-white p-1.5 rounded-lg">
                                                <Activity className="h-5 w-5" />
                                            </div>
                                        )}
                                        <p className={`text-xs font-black uppercase tracking-[0.2em] ${
                                            result.urgency === 'Emergency' ? 'text-red-500' :
                                            result.urgency === 'High' ? 'text-red-500' : 'text-primary'
                                        }`}>
                                            {result.urgency === 'Emergency' ? 'CRITICAL MEDICAL ALERT' :
                                             result.urgency === 'High' ? 'IMMEDIATE ATTENTION REQUIRED' : 'STANDARD GUIDANCE'}
                                        </p>
                                    </div>
                                    
                                    <p className={`text-base leading-relaxed tracking-tight ${
                                        result.urgency === 'Emergency' ? 'font-bold text-red-950 dark:text-red-100' : 
                                        result.urgency === 'High' ? 'font-semibold text-red-950 dark:text-red-100' : 'font-medium text-foreground/80'
                                    }`}>
                                        {result.advice}
                                    </p>

                                    {result.specialist !== "N/A" && (
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Recommended Specialist: <span className="text-foreground font-bold">{result.specialist}</span>
                                        </p>
                                    )}
                                </div>

                                {((result.precautions && result.precautions.length > 0) || (result.next_steps && result.next_steps.length > 0)) && (
                                    <div className={`space-y-3 p-5 rounded-3xl border ${
                                        result.urgency === 'Emergency' ? 'bg-red-500/5 border-red-500/30' :
                                        result.urgency === 'High' ? 'bg-red-500/5 border-red-500/30' :
                                        'bg-background/50 border-border/50'
                                    }`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            {result.precautions && result.precautions.length > 0 ? (
                                                <ShieldCheck className={`h-4 w-4 ${
                                                    result.urgency === 'Emergency' ? 'text-red-500' :
                                                    result.urgency === 'High' ? 'text-red-500' : 'text-primary'
                                                }`} />
                                            ) : (
                                                <ListChecks className={`h-4 w-4 ${
                                                    result.urgency === 'Emergency' ? 'text-red-500' :
                                                    result.urgency === 'High' ? 'text-red-500' : 'text-primary'
                                                }`} />
                                            )}
                                            <p className={`text-[10px] font-black uppercase tracking-tighter ${
                                                result.urgency === 'Emergency' ? 'text-red-500' :
                                                result.urgency === 'High' ? 'text-red-500' : 'text-primary'
                                            }`}>
                                                {result.precautions && result.precautions.length > 0 ? 
                                                    (result.urgency === 'Emergency' ? "EMERGENCY PRECAUTIONS" : "STANDARD PRECAUTIONS") : 
                                                    "SUGGESTED NEXT STEPS"}
                                            </p>
                                        </div>
                                        <ul className="space-y-2">
                                            {(result.precautions && result.precautions.length > 0 ? result.precautions : result.next_steps)?.map((item, i) => (
                                                <li key={i} className={`text-sm font-bold flex items-center gap-2 ${
                                                    result.urgency === 'Emergency' ? 'text-red-900 dark:text-red-200' :
                                                    result.urgency === 'High' ? 'text-red-900 dark:text-red-200' : 'text-foreground'
                                                }`}>
                                                    <div className={`h-1.5 w-1.5 rounded-full ${
                                                        result.urgency === 'Emergency' ? 'bg-red-500' :
                                                        result.urgency === 'High' ? 'bg-red-500' : 'bg-primary/40'
                                                    }`} />
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
                                        <Link to={`/find-care?symptoms=${encodeURIComponent(symptoms)}`} state={{ aiResult: result }}>
                                            <MapPin className="h-5 w-5" />
                                            {result.urgency === 'High' ? 'Find Emergency Care' : `Locate ${result.specialist || 'General Physician'}`}
                                        </Link>
                                    </Button>

                                    {result.condition !== 'Unspecific Symptoms' && result.confidence > 0 && (
                                    <div className="flex items-center justify-between w-full h-14 px-4 rounded-2xl border-2 bg-background text-foreground">
                                        <div className="flex items-center gap-3 ml-2">
                                            <div className="p-1.5 bg-primary/10 rounded-lg">
                                                <FileText className="h-4 w-4 text-primary" />
                                            </div>
                                            <span className="text-lg font-bold">AI Report</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 rounded-xl hover:bg-muted hover:text-primary transition-colors"
                                                onClick={handlePreviewPDF}
                                                title="Preview"
                                            >
                                                <Eye className="h-5 w-5" />
                                            </Button>
                                            <div className="w-px h-6 bg-border mx-1"></div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 rounded-xl hover:bg-muted hover:text-primary transition-colors"
                                                onClick={handleDownloadPDF}
                                                title="Download"
                                            >
                                                <Download className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    </div>
                                    )}
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
                        
                        {/* Preview Dialog */}
                        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                            <DialogContent className="rounded-[2rem] sm:max-w-4xl max-h-[90vh] flex flex-col">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-bold">AI Health Report Preview</DialogTitle>
                                </DialogHeader>
                                <div className="flex-1 overflow-hidden bg-muted/20 rounded-xl min-h-[500px] flex items-center justify-center relative">
                                    {previewUrl && (
                                        <iframe src={`${previewUrl}#toolbar=0`} className="absolute inset-0 w-full h-full rounded-lg border-none" title="AI Health Report" />
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}
            </CardContent>
        </Card >
    )
}
