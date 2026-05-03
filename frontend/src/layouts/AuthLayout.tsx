import { Link, Outlet } from "react-router-dom";
import { Activity } from "lucide-react";
import { AnimatedBackground } from "@/components/animated-background";

export default function AuthLayout() {
    return (
        <div className="min-h-screen w-full flex flex-row-reverse bg-background">

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
