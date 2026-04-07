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

export function FamilyProvider({ children }: { children: ReactNode }) {
    const [familyMembers, setFamilyMembers] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

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

export function useFamilyContext() {
    return useContext(FamilyContext)
}
