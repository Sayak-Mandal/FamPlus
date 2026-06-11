import * as React from "react"
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { register, googleAuthLogin } from "@/app/actions/user"
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
    const [googleLoading, setGoogleLoading] = React.useState(false)
    const googleBtnRef = React.useRef<HTMLDivElement>(null)

    // Load Google Identity Services and render the official Google button
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
                setError(err.message || "Google sign-up failed. Please try again.");
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
                shape: "rectangular",
                width: googleBtnRef.current.offsetWidth || 320,
                text: "signup_with",
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

                {/* Official Google Sign-Up button rendered by GIS library */}
                <div className="relative flex justify-center">
                    {googleLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 rounded-lg">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        </div>
                    )}
                    <div ref={googleBtnRef} className="w-full" />
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
