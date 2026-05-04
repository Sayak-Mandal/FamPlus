
import * as React from "react"
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { register } from "@/app/actions/user"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function SignupPage() {
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = React.useState<boolean>(false)
    const [error, setError] = React.useState<string | null>(null)

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            const formData = new FormData(event.currentTarget)
            const name = formData.get("name") as string
            const email = formData.get("email") as string
            const password = formData.get("password") as string

            if (!name || !email || !password) {
                throw new Error("All fields are required")
            }

            await register(name, email, password)
            navigate("/dashboard")
        } catch (err: any) {
            setError(err.message || "Signup failed. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="w-full">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl">Create an account</CardTitle>
                <CardDescription>
                    Enter your information to create your FamPlus account
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <form onSubmit={onSubmit}>
                    <div className="grid gap-2">
                        <div className="grid gap-1">
                             <Input
                                 id="name"
                                 name="name"
                                 placeholder="Full Name"
                                 type="text"
                                 autoCapitalize="words"
                                 autoComplete="name"
                                 autoCorrect="off"
                                 disabled={isLoading}
                                 required
                             />
                        </div>
                        <div className="grid gap-1">
                             <Input
                                 id="email"
                                 name="email"
                                 placeholder="name@example.com"
                                 type="email"
                                 autoCapitalize="none"
                                 autoComplete="email"
                                 autoCorrect="off"
                                 disabled={isLoading}
                                 required
                             />
                        </div>
                        <div className="grid gap-1">
                             <Input
                                 id="password"
                                 name="password"
                                 placeholder="Password"
                                 type="password"
                                 autoCapitalize="none"
                                 disabled={isLoading}
                                 required
                             />
                        </div>
                             {error && (
                                <p className="text-sm text-red-500 text-center mb-2">{error}</p>
                            )}
                            <Button disabled={isLoading} type="submit" className="w-full">
                                {isLoading && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Create Account
                            </Button>
                    </div>
                </form>

                <div className="relative flex items-center justify-center my-2">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink mx-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Or join with</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Button 
                        variant="outline" 
                        type="button" 
                        className="rounded-lg h-10 border-gray-200 hover:bg-gray-50 flex items-center justify-center space-x-2"
                        onClick={() => alert("Google Signup is simulated for this prototype.")}
                    >
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        <span className="text-xs font-semibold">Google</span>
                    </Button>
                    <Button 
                        variant="outline" 
                        type="button" 
                        className="rounded-lg h-10 border-gray-200 hover:bg-gray-50 flex items-center justify-center space-x-2"
                        onClick={() => alert("Facebook Signup is simulated for this prototype.")}
                    >
                        <svg className="h-4 w-4 fill-[#1877F2]" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                        <span className="text-xs font-semibold">Facebook</span>
                    </Button>
                </div>
            </CardContent>
            <CardFooter>
                <p className="px-8 text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link
                        to="/login"
                        className="underline underline-offset-4 hover:text-primary"
                    >
                        Sign in
                    </Link>
                </p>
            </CardFooter>
        </Card>
    )
}
