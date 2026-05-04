import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, User, Lock, Eye, EyeOff } from "lucide-react"
import { login } from "@/app/actions/user"

export default function LoginPage() {
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const [showPassword, setShowPassword] = React.useState(false)

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

                {/* Password Input (Dummy for now) */}
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

                <div className="grid grid-cols-2 gap-4">
                    <Button 
                        variant="outline" 
                        type="button" 
                        className="rounded-full h-11 border-2 border-gray-100 hover:border-primary/20 hover:bg-gray-50 transition-all flex items-center justify-center space-x-2"
                        onClick={() => alert("Google Login is simulated for this prototype.")}
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-tight">Google</span>
                    </Button>

                    <Button 
                        variant="outline" 
                        type="button" 
                        className="rounded-full h-11 border-2 border-gray-100 hover:border-primary/20 hover:bg-gray-50 transition-all flex items-center justify-center space-x-2"
                        onClick={() => alert("Facebook Login is simulated for this prototype.")}
                    >
                        <svg className="h-5 w-5 fill-[#1877F2]" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-tight">Facebook</span>
                    </Button>
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
