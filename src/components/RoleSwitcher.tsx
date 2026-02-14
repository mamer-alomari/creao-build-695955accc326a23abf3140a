import { useCreaoAuth, UserRole } from "@/sdk/core/auth";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Shield, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function RoleSwitcher() {
    const { role, setRole } = useCreaoAuth();

    const roles: { value: UserRole; label: string; color: string }[] = [
        { value: UserRole.Admin, label: 'Admin', color: 'bg-red-50 text-red-700 border-red-200' },
        { value: UserRole.Manager, label: 'Manager', color: 'bg-blue-50 text-blue-700 border-blue-200' },
        { value: UserRole.Worker, label: 'Worker', color: 'bg-green-50 text-green-700 border-green-200' },
    ];

    const currentRole = roles.find(r => r.value === role) || roles[0];

    return (
        <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden md:inline">Current Role:</span>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-2 border-dashed">
                        <Shield className="h-3.5 w-3.5" />
                        <span className="font-medium">{currentRole.label}</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {roles.map((r) => (
                        <DropdownMenuItem
                            key={r.value}
                            onClick={() => setRole(r.value)}
                            className="flex items-center justify-between gap-4"
                        >
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className={`h-5 px-1.5 ${r.color} border-0`}>
                                    {r.label[0]}
                                </Badge>
                                <span>{r.label}</span>
                            </div>
                            {role === r.value && <Check className="h-4 w-4" />}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
