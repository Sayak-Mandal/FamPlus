import { useState, useEffect, useRef, useCallback } from 'react'

export function useSpeechRecognition() {
    const [isListening, setIsListening] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [error, setError] = useState<string | null>(null)
    const recognitionRef = useRef<any>(null)

    useEffect(() => {
        const SpeechRecognition = typeof window !== 'undefined' 
            ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) 
            : null

        if (SpeechRecognition) {
            const recognition = new SpeechRecognition()
            recognition.continuous = false
            recognition.interimResults = false
            recognition.lang = 'en-US'

            recognition.onstart = () => {
                setIsListening(true)
                setError(null)
            }

            recognition.onend = () => {
                setIsListening(false)
            }

            recognition.onerror = (event: any) => {
                console.error("Speech recognition error:", event.error)
                setError(event.error)
                setIsListening(false)
            }

            recognitionRef.current = recognition
        }
    }, [])

    const startListening = useCallback((onResult: (text: string) => void) => {
        if (!recognitionRef.current) {
            setError('Speech recognition not supported')
            return
        }

        recognitionRef.current.onresult = (event: any) => {
            const text = event.results[0][0].transcript
            setTranscript(text)
            onResult(text)
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

    const isSupported = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)

    return {
        isListening,
        transcript,
        error,
        startListening,
        stopListening,
        toggleListening,
        isSupported
    }
}
