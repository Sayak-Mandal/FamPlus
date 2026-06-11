import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, User, Lock, Eye, EyeOff } from "lucide-react"
import { login, googleAuthLogin } from "@/app/actions/user"

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: object) => void;
                    renderButton: (element: HTMLElement, config: object) => void;
                    prompt: () => void;
                };
            };
        };
    }
}

export default function LoginPage() {
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const [showPassword, setShowPassword] = React.useState(false)
    const [googleLoading, setGoogleLoading] = React.useState(false)
    const googleBtnRef = React.useRef<HTMLDivElement>(null)

    // Load Google Identity Services script and render the official Google button
    React.useEffect(() => {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId) return;

        const handleGoogleCallback = async (response: { credential: string }) => {
            setGoogleLoading(true);
            setError(null);
            try {
                await googleAuthLogin(response.credential);
                navigate("/dashboard");
            } catch (err: any) {
                setError(err.message || "Google login failed. Please try again.");
            } finally {
                setGoogleLoading(false);
            }
        };

        const initGoogle = () => {
            if (!window.google || !googleBtnRef.current) return;
            window.google.accounts.id.initialize({
                client_id: clientId,
                callback: handleGoogleCallback,
            });
            window.google.accounts.id.renderButton(googleBtnRef.current, {
                theme: "outline",
                size: "large",
                shape: "pill",
                width: googleBtnRef.current.offsetWidth || 280,
                text: "signin_with",
            });
        };

        if (window.google) {
            initGoogle();
        } else {
            const script = document.createElement("script");
            script.src = "https://accounts.google.com/gsi/client";
            script.async = true;
            script.defer = true;
            script.onload = initGoogle;
            document.head.appendChild(script);
        }
    }, [navigate]);

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            const formData = new FormData(event.currentTarget)
            await login(formData)
            navigate("/dashboard")
        } catch (err: any) {
            setError(err.message || "Login failed. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-center w-full max-w-xs mx-auto space-y-6">
            {/* User Avatar Circle */}
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-4 border-4 border-primary">
                <User className="h-12 w-12 text-primary" strokeWidth={2.5} />
            </div>

            <form onSubmit={onSubmit} className="w-full space-y-4">
                {/* Username Input */}
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <User className="h-5 w-5" />
                    </div>
                    <Input
                        id="username"
                        name="username"
                        placeholder="USERNAME"
                        type="text"
                        autoCapitalize="words"
                        autoComplete="username"
                        autoCorrect="off"
                        required
                        disabled={isLoading}
                        className="h-12 pl-12 rounded-full border-2 border-gray-200 focus-visible:ring-primary focus-visible:border-primary text-sm font-medium tracking-wide placeholder:text-gray-400"
                    />
                </div>

                {/* Password Input */}
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <Lock className="h-5 w-5" />
                    </div>
                    <Input
                        id="password"
                        name="password"
                        placeholder="Password"
                        type={showPassword ? "text" : "password"}
                        autoCapitalize="none"
                        autoComplete="current-password"
                        disabled={isLoading}
                        className="h-12 pl-12 pr-12 rounded-full border-2 border-gray-200 focus-visible:ring-primary focus-visible:border-primary"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                        disabled={isLoading}
                    >
                        {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                        ) : (
                            <Eye className="h-5 w-5" />
                        )}
                    </button>
                </div>

                {error && (
                    <p className="text-sm text-red-500 text-center">{error}</p>
                )}

                <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-full text-base font-bold tracking-widest uppercase hover:opacity-90 transition-opacity shadow-lg mt-4"
                >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                    Login
                </Button>

                <div className="flex items-center justify-between text-xs text-gray-500 px-2 mt-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary accent-primary h-4 w-4" />
                        <span>Remember me</span>
                    </label>
                    <Link
                        to="/forgot-password"
                        className="hover:text-primary transition-colors"
                    >
                        Forgot your password?
                    </Link>
                </div>
            </form>

            {/* Social Login Section */}
            <div className="w-full space-y-4 pt-2">
                <div className="relative flex items-center justify-center">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink mx-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Or continue with</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                </div>

                {/* Official Google Sign-In button rendered by GIS library */}
                <div className="relative flex justify-center">
                    {googleLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-full z-10">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        </div>
                    )}
                    <div ref={googleBtnRef} className="w-full" />
                </div>
            </div>

            {/* Footer Links */}
            <div className="text-center space-y-4 mt-8">
                <div className="flex justify-center space-x-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/40"></span>
                    <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/40"></span>
                </div>

                <p className="text-sm text-gray-400 font-medium">
                    Not a member?{" "}
                    <Link
                        to="/signup"
                        className="text-primary font-bold hover:underline"
                    >
                        Sign up now
                    </Link>
                </p>
            </div>
        </div>
    )
}
