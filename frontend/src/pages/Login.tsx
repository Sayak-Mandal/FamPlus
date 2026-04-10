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
