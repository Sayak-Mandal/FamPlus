
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { BarChart3, Heart, Home, MapPin, Users, Activity, Sparkles, LogOut, History, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

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

export function Sidebar({ onClose, isCollapsed, onToggle }: { onClose?: () => void; isCollapsed?: boolean; onToggle?: () => void }) {
    const pathname = useLocation().pathname

    return (
        <div className={cn(
            "space-y-4 py-4 flex flex-col h-full bg-card text-card-foreground border-r border-border transition-all duration-300",
            isCollapsed ? "w-20" : "w-72"
        )}>
            <div className="px-3 py-2 flex-1">
                <div className={cn(
                    "flex items-center pl-3 mb-10 transition-all",
                    isCollapsed ? "justify-center pl-0" : "justify-between"
                )}>
                    <div className={cn(
                        "flex items-center gap-2",
                        isCollapsed && "flex-col"
                    )}>
                        <button 
                            onClick={onToggle} 
                            className="p-2 hover:bg-accent rounded-xl transition-all active:scale-95 group"
                            title={isCollapsed ? "Expand" : "Collapse"}
                        >
                            <Menu className={cn(
                                "h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors",
                                !isCollapsed && "h-6 w-6"
                            )} />
                        </button>
                        {!isCollapsed && (
                            <span className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Menu</span>
                        )}
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="md:hidden p-2 hover:bg-accent rounded-full transition">
                            <X className="h-5 w-5 text-muted-foreground" />
                        </button>
                    )}
                </div>
                <div className="space-y-1">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            to={route.href}
                            onClick={onClose}
                            className={cn(
                                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-xl transition-all",
                                pathname === route.href ? "bg-accent text-accent-foreground font-bold shadow-sm" : "text-muted-foreground",
                                isCollapsed ? "justify-center px-2" : "px-3"
                            )}
                        >
                            <div className={cn(
                                "flex items-center",
                                isCollapsed ? "justify-center" : "flex-1"
                            )}>
                                <route.icon className={cn(
                                    "h-5 w-5 transition-all", 
                                    !isCollapsed && "mr-3",
                                    route.color
                                )} />
                                {!isCollapsed && (
                                    <motion.span
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                    >
                                        {route.label}
                                    </motion.span>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
            <div className="px-3 py-2">
                {!isCollapsed && (
                    <div className="bg-accent/50 rounded-2xl p-4 border border-border mb-4">
                        <p className="text-[10px] text-muted-foreground mb-2 font-black uppercase tracking-widest text-primary/70">Pro Tip</p>
                        <p className="text-sm text-foreground leading-snug">Log symptoms daily for better AI insights.</p>
                    </div>
                )}
                <div className={cn(
                    "pt-4 border-t border-border",
                    isCollapsed ? "flex justify-center" : ""
                )}>
                    <Link
                        to="/login"
                        className={cn(
                            "text-sm group flex p-3 w-full font-medium cursor-pointer text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all",
                            isCollapsed ? "justify-center px-2" : "justify-start"
                        )}
                    >
                        <div className="flex items-center">
                            <LogOut className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                            {!isCollapsed && <span>Log Out</span>}
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    )
}
