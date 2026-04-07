
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LayoutDashboard, Settings, LogOut, User, Bell, Menu, PlusCircle, Trash2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Sidebar } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { deleteAccount } from "@/app/actions/user"
import { useFamilyContext } from "@/app/family-context"

interface DashboardHeaderProps {
    user?: {
        name: string | null;
        email: string | null;
    } | null;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
    const navigate = useNavigate()
    const { familyMembers, selectedMemberId } = useFamilyContext()

    const handleAddAccount = () => {
        navigate("/login")
    }

    const handleDeleteAccount = async () => {
        if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
            await deleteAccount()
        }
    }

    const primaryMember = familyMembers?.find((m: any) => (m.id || m._id) === selectedMemberId) || familyMembers?.[0];
    const userAvatar = primaryMember?.avatar;
    const displayName = primaryMember?.name || user?.name || "User";
    const displayEmail = user?.email || "user@famplus.com";
    const initials = displayName.charAt(0).toUpperCase();

    return (
        <header className="h-16 border-b bg-white flex items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-4">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="md:hidden h-11 w-11">
                            <Menu className="h-6 w-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 bg-white w-72">
                        <Sidebar />
                    </SheetContent>
                </Sheet>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger className="outline-none">
                    <Avatar className="h-10 w-10 cursor-pointer border-2 border-primary/20 hover:border-primary transition-colors bg-white">
                        <AvatarImage src={userAvatar || ""} /> 
                        <AvatarFallback className="bg-primary text-white font-bold">{initials}</AvatarFallback>
                    </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{displayName}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                                {displayEmail}
                            </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleAddAccount} className="cursor-pointer">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span>Add Account / Switch</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={handleDeleteAccount}
                        className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete Account</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/login")} className="cursor-pointer">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
    )
}
