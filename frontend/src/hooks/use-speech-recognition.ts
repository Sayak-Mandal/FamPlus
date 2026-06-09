import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Custom React Hook: `useSpeechRecognition`
 * --------------------------------------------------------------------------
 * Encapsulates the native Web Speech API to provide voice-to-text functionality.
 * 
 * Key Features:
 * - Cross-browser compatibility (`webkitSpeechRecognition` fallback).
 * - Distinguishes between "interim" (real-time guessing) and "final" (confirmed) transcripts.
 * - Safe initialization to prevent SSR crashes (checks for `window`).
 * 
 * @returns Object containing state variables and control functions for speech recognition.
 */
export function useSpeechRecognition() {
    // ── State Trackers ────────────────────────────────────────────────────────
    const [isListening, setIsListening] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [interimTranscript, setInterimTranscript] = useState('')
    const [error, setError] = useState<string | null>(null)
    // Ref to hold the native SpeechRecognition instance across re-renders without triggering them
    const recognitionRef = useRef<any>(null)

    // ── Initialization Effect ─────────────────────────────────────────────────
    useEffect(() => {
        // Fallback for Safari/Chrome support
        const SpeechRecognition = typeof window !== 'undefined' 
            ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) 
            : null

        if (SpeechRecognition) {
            const recognition = new SpeechRecognition()
            recognition.continuous = false
            recognition.interimResults = true
            recognition.lang = 'en-US'

            recognition.onstart = () => {
                setIsListening(true)
                setError(null)
                setInterimTranscript('')
            }

            recognition.onend = () => {
                setIsListening(false)
                setInterimTranscript('')
            }

            recognition.onerror = (event: any) => {
                console.error("Speech recognition error:", event.error)
                setError(event.error)
                setIsListening(false)
                setInterimTranscript('')
            }

            recognitionRef.current = recognition
        }
    }, [])

    // ── Control Methods ───────────────────────────────────────────────────────

    /**
     * Initializes listening and binds the `onresult` handler dynamically.
     * @param onResult Callback fired whenever a 'final' transcript chunk is processed.
     */
    const startListening = useCallback((onResult: (text: string) => void) => {
        if (!recognitionRef.current) {
            setError('Speech recognition not supported')
            return
        }

        recognitionRef.current.onresult = (event: any) => {
            let interim = ''
            let final = ''

            // The Web Speech API returns an array of results. We must iterate
            // through them to separate the finalized words from the ones it is still guessing.
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript
                } else {
                    interim += event.results[i][0].transcript
                }
            }

            setInterimTranscript(interim)

            if (final) {
                setTranscript(final)
                onResult(final)
                setInterimTranscript('')
            }
        }

        try {
            recognitionRef.current.start()
        } catch (e) {
            console.error("Error starting speech recognition:", e)
        }
    }, [])

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop()
            } catch (e) {
                console.error("Error stopping speech recognition:", e)
            }
        }
    }, [])

    const toggleListening = useCallback((onResult: (text: string) => void) => {
        if (isListening) {
            stopListening()
        } else {
            startListening(onResult)
        }
    }, [isListening, startListening, stopListening])

    // Expose whether the user's browser actually supports this API
    const isSupported = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)

    return {
        isListening,
        transcript,
        interimTranscript,
        error,
        startListening,
        stopListening,
        toggleListening,
        isSupported
    }
}
