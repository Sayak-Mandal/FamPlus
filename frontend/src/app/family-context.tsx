/**
 * @file family-context.tsx
 * @description Global State Management for Family Circle Data.
 * Uses React Context to provide family member profiles and vitals universally 
 * across the dashboard and AI modules without prop drilling.
 */
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react"
import { getFamilyMembers } from "@/app/actions/health"

interface FamilyContextType {
    familyMembers: any[]
    isLoading: boolean
    refresh: () => Promise<void>
    selectedMemberId: string | null
    setSelectedMemberId: (id: string) => void
}

const FamilyContext = createContext<FamilyContextType>({
    familyMembers: [],
    isLoading: false,
    refresh: async () => {},
    selectedMemberId: null,
    setSelectedMemberId: () => {},
})

/**
 * Context Provider Component
 * Wraps the application (or relevant sub-trees) to inject the FamilyContext.
 * Automatically fetches the user's family circle upon mounting.
 */
export function FamilyProvider({ children }: { children: ReactNode }) {
    const [familyMembers, setFamilyMembers] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

    /**
     * Refetches family data from the backend.
     * Useful after adding/editing a family member or logging new vitals.
     */
    const refresh = useCallback(async () => {
        const userId = localStorage.getItem("userId")
        if (!userId) { setIsLoading(false); return }
        try {
            const data = await getFamilyMembers(userId)
            if (Array.isArray(data)) {
                const members = data.map((m: any) => ({ ...m, id: m._id || m.id }))
                setFamilyMembers(members)
                setSelectedMemberId((prev) => {
                    if (!prev && members.length > 0) return members[0].id
                    return prev
                })
            }
        } catch (e) {
            console.error("FamilyContext refresh error:", e)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        refresh()
    }, [refresh])

    return (
        <FamilyContext.Provider value={{ familyMembers, isLoading, refresh, selectedMemberId, setSelectedMemberId }}>
            {children}
        </FamilyContext.Provider>
    )
}

/**
 * Custom hook to consume the FamilyContext.
 * @throws Will throw a standard React Context error if used outside a FamilyProvider.
 * @returns {FamilyContextType} The context state and mutation functions.
 */
export function useFamilyContext() {
    return useContext(FamilyContext)
}
