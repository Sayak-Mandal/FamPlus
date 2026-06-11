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
            <div className="h-screen w-full flex flex-col bg-white overflow-hidden">
                {/* Top Header - Full Width */}
                <div className="flex-none z-[90] bg-white border-b">
                    <DashboardHeader 
                        user={user} 
                        isCollapsed={isCollapsed} 
                        onToggle={() => setIsCollapsed(!isCollapsed)} 
                    />
                </div>
                
                {/* Bottom Section - Sidebar + Main Content */}
                <div className="flex-1 relative flex overflow-hidden">
                    {/* Desktop Sidebar */}
                    <div className={cn(
                        "hidden md:flex md:flex-col border-r transition-all duration-300 bg-card overflow-hidden z-[80]",
                        isCollapsed ? "md:w-20" : "md:w-72"
                    )}>
                        <Sidebar isCollapsed={isCollapsed} />
                    </div>
                    
                    {/* Main Content */}
                    <main className="flex-1 bg-gradient-to-br from-slate-50 to-white overflow-y-auto">
                        <div className="px-4 md:px-8 py-6 max-w-[1600px] mx-auto min-h-full">
                            <Outlet />
                        </div>
                    </main>
                </div>
            </div>
        </FamilyProvider>
    )
}
