import { Link, Outlet } from "react-router-dom";

export default function AuthLayout() {
    return (
        <div className="min-h-screen w-full flex bg-background">
            {/* Left Side - Form Container */}
            <div className="w-full md:w-1/2 lg:w-[45%] flex flex-col justify-center px-8 md:px-16 lg:px-24 relative z-10 bg-background/95 backdrop-blur-sm">
                <div className="mb-8 md:absolute md:top-8 md:left-12 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-md">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-5 w-5"
                        >
                            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                        </svg>
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
