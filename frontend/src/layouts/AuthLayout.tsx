import { Link, Outlet } from "react-router-dom";
import { Activity } from "lucide-react";

export default function AuthLayout() {
    return (
        <div className="min-h-screen w-full flex bg-background">
            {/* Left Side - Form Container */}
            <div className="w-full md:w-1/2 lg:w-[45%] flex flex-col justify-center px-8 md:px-16 lg:px-24 relative z-10 bg-background/95 backdrop-blur-sm">
                <div className="mb-8 md:absolute md:top-8 md:left-12 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-md">
                        <Activity className="h-5 w-5" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-foreground">FamPlus</span>
                </div>

                <div className="w-full max-w-sm mx-auto">
                    <Outlet />
                </div>
            </div>

            {/* Right Side - Abstract Artistic Background */}
            <div className="hidden md:flex w-1/2 lg:w-[55%] relative overflow-hidden bg-primary/10 items-end justify-end p-12 lg:p-20">
                {/* Abstract CSS Shapes/Gradient */}
                <div className="absolute inset-0 bg-[#F9F7F2] dark:bg-black">
                    <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-gradient-to-br from-primary via-orange-400 to-red-400 opacity-80 blur-3xl" />
                    <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-orange-200 to-primary opacity-60 blur-3xl" />
                    <div className="absolute top-[40%] left-[20%] w-[400px] h-[400px] rounded-full bg-orange-300/50 blur-[100px]" />

                    {/* Glassmorphic Overlay/Texture */}
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]" />
                </div>

                {/* Content Overlay */}
                <div className="relative z-10 text-right space-y-2">

                    <h1 className="text-6xl lg:text-8xl font-black text-orange-950 tracking-tighter drop-shadow-sm">
                        Welcome.
                    </h1>
                    <p className="text-orange-950/80 max-w-md ml-auto text-sm leading-relaxed text-right mt-4 font-medium">
                        Monitor your family's health with intelligent insights.
                        Join thousands of families trusting FamPlus.
                    </p>
                </div>
            </div>
        </div>
    );
}
