import { Sidebar } from "@/components/sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { useNavigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { FamilyProvider } from "@/app/family-context";

export default function DashboardLayout() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);

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
                <div className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] border-r">
                    <Sidebar />
                </div>
                
                {/* Main Content */}
                <main className="flex-1 md:pl-72 bg-gradient-to-br from-slate-50 to-white min-h-screen">
                    <DashboardHeader user={user} />
                    <div className="px-4 md:px-8 py-6">
                        <Outlet />
                    </div>
                </main>
            </div>
        </FamilyProvider>
    )
}
