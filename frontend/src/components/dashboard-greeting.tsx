
import { useEffect, useState } from "react"

interface DashboardGreetingProps {
    name: string | null | undefined
}

export function DashboardGreeting({ name }: DashboardGreetingProps) {
    const [greeting, setGreeting] = useState("Good Morning")

    // Capitalize first letter of each word in the name
    const formattedName = name
        ? name.split(' ').map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' ')
        : "User"

    useEffect(() => {
        const hour = new Date().getHours()

        if (hour < 12) {
            setGreeting("Good Morning")
        } else if (hour < 18) {
            setGreeting("Good Afternoon")
        } else {
            setGreeting("Good Evening")
        }
    }, [])

    return (
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
            {greeting}, {formattedName}! 👋
        </h2>
    )
}
