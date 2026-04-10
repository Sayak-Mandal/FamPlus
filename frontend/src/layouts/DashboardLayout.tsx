import { Sidebar } from "@/components/sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { useNavigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { FamilyProvider } from "@/app/family-context";
import { cn } from "@/lib/utils";

export default function DashboardLayout() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        const userId = localStorage.getItem("userId");
        if (!userId) {
            navigate("/login");
            return;
        }
        setUser({ id: userId, name: "User" });
    }, [navigate]);

    if (!user) return null;

    return (
        <FamilyProvider>
            <div className="h-full relative flex flex-col md:flex-row">
                {/* Desktop Sidebar */}
                <div className={cn(
                    "hidden md:flex md:flex-col md:fixed md:inset-y-0 z-[80] border-r transition-all duration-300 bg-white",
                    isCollapsed ? "md:w-20" : "md:w-72"
                )}>
                    <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
                </div>
                
                {/* Main Content */}
                <main className={cn(
                    "flex-1 bg-gradient-to-br from-slate-50 to-white min-h-screen transition-all duration-300",
                    isCollapsed ? "md:pl-20" : "md:pl-72"
                )}>
                    <DashboardHeader user={user} />
                    <div className="px-4 md:px-8 py-6 max-w-[1600px] mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </FamilyProvider>
    )
}
