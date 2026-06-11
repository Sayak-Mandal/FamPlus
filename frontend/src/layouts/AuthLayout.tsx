import { Link, Outlet } from "react-router-dom";
import { Activity } from "lucide-react";
import { AnimatedBackground } from "@/components/animated-background";

export default function AuthLayout() {
    return (
        <div className="relative min-h-screen w-full flex flex-row-reverse bg-background">

            {/* Absolute Brand Logo at Top Left Corner */}
            <Link to="/" className="absolute top-8 left-8 md:top-12 md:left-12 lg:top-16 lg:left-20 flex items-center gap-3 z-50 group cursor-pointer transition-transform hover:scale-105 active:scale-95">
                <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl bg-primary text-white shadow-md">
                    <Activity className="h-6 w-6 md:h-7 md:w-7" strokeWidth={2.5} />
                </div>
                <span className="text-2xl md:text-3xl font-black tracking-tight text-foreground md:text-orange-950 drop-shadow-sm group-hover:text-primary transition-colors">FamPlus</span>
            </Link>

            {/* Left Side - Form Container */}
            <div className="w-full md:w-1/2 lg:w-[45%] flex flex-col justify-center px-8 md:px-16 lg:px-24 relative z-10 bg-background/95 backdrop-blur-sm pt-24 md:pt-0">
                <div className="w-full max-w-sm mx-auto">
                    <Outlet />
                </div>
            </div>

            {/* Right Side - Abstract Artistic Background (Now on Left) */}
            <div className="hidden md:flex w-1/2 lg:w-[55%] relative overflow-hidden bg-primary/10 items-end justify-start p-12 lg:p-20">
                {/* 3D Animated Medical/Abstract Background */}
                <AnimatedBackground />

                {/* Content Overlay */}
                <div className="relative z-10 text-left space-y-2">

                    <h1 className="text-6xl lg:text-8xl font-black text-orange-950 tracking-tighter drop-shadow-sm">
                        Welcome.
                    </h1>
                    <p className="text-orange-950/80 max-w-md mr-auto text-sm leading-relaxed text-left mt-4 font-medium">
                        Monitor your family's health with intelligent insights.
                        Join thousands of families trusting FamPlus.
                    </p>
                </div>
            </div>
        </div>
    );
}
