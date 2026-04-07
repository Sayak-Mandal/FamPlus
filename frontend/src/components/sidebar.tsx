
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { BarChart3, Heart, Home, MapPin, Users, Activity, Sparkles, LogOut, History } from "lucide-react"
import { cn } from "@/lib/utils"

const routes = [
    {
        label: "Overview",
        icon: Home,
        href: "/dashboard",
        color: "text-foreground", // Was sky-500
    },
    {
        label: "AI Health Check",
        icon: Sparkles,
        href: "/ai-check",
        color: "text-primary", // Was rose-500, now Red (Primary)
    },
    {
        label: "Vitals Journey",
        icon: Activity,
        href: "/journey",
        color: "text-foreground", // Was orange-500
    },
    {
        label: "History & Edits",
        icon: History,
        href: "/history",
        color: "text-foreground",
    },
    {
        label: "Find Care",
        icon: MapPin,
        href: "/find-care",
        color: "text-foreground", // Was emerald-500
    },
]

export function Sidebar() {
    const pathname = useLocation().pathname

    return (
        <div className="space-y-4 py-4 flex flex-col h-full bg-card text-card-foreground border-r border-border">
            <div className="px-3 py-2 flex-1">
                <Link to="/dashboard" className="flex items-center pl-3 mb-14">
                    <div className="relative h-8 w-8 mr-4">
                        <Activity className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold font-mono text-foreground">
                        FamPlus
                    </h1>
                </Link>
                <div className="space-y-1">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            to={route.href}
                            className={cn(
                                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-lg transition",
                                pathname === route.href ? "bg-accent text-accent-foreground font-bold" : "text-muted-foreground"
                            )}
                        >
                            <div className="flex items-center flex-1">
                                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                                {route.label}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
            <div className="px-3 py-2">
                <div className="bg-accent/50 rounded-lg p-3 border border-border">
                    <p className="text-xs text-muted-foreground mb-2 font-bold uppercase tracking-wider">Pro Tip</p>
                    <p className="text-sm text-foreground">Log symptoms daily for better AI insights.</p>
                </div>
                <div className="mt-4 pt-4 border-t border-border">
                    <Link
                        to="/login"
                        className="text-sm group flex p-3 w-full justify-start font-medium cursor-pointer text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition"
                    >
                        <div className="flex items-center flex-1">
                            <LogOut className="h-5 w-5 mr-3" />
                            Log Out
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    )
}
