
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useCreaoAuth } from "@/sdk/core/auth";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { ReportIncidentDialog } from "@/features/worker/components/ReportIncidentDialog";

interface VehicleChecklistDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (checklist: any) => void;
    vehicleName: string;
}

export function VehicleChecklistDialog({ isOpen, onClose, onConfirm, vehicleName }: VehicleChecklistDialogProps) {
    const { user } = useCreaoAuth();
    const [checks, setChecks] = useState({
        engine_start: false,
        no_check_engine_light: false,
        warmed_up: false,
        equipment_present: false,
    });

    const [activeIncident, setActiveIncident] = useState<{ label: string, key: string } | null>(null);

    const handleCheckChange = (key: keyof typeof checks, checked: boolean) => {
        setChecks(prev => ({ ...prev, [key]: checked }));
    };

    const allChecked = Object.values(checks).every(Boolean);

    const handleSubmit = () => {
        if (!user?.uid) return;

        onConfirm({
            ...checks,
            timestamp: new Date().toISOString(),
            completed_by: user.uid
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        Vehicle Safety Check
                    </DialogTitle>
                    <DialogDescription>
                        Please verify the condition of <strong>{vehicleName}</strong> before starting the route.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Helper to render check item with report button */}
                    {([
                        { key: "engine_start", label: "Vehicle Starts", desc: "Engine turns on without issues." },
                        { key: "no_check_engine_light", label: "No check engine light", desc: "Verify dashboard has no warning lights." },
                        { key: "warmed_up", label: "Vehicle warmed up", desc: "Warmed up for 15 mins and not overheating." },
                        { key: "equipment_present", label: "Equipment in vehicle", desc: "Confirm all necessary equipment is on board." }
                    ] as const).map((item) => (
                        <div key={item.key} className="flex items-center gap-2">
                            <div
                                className="flex-1 flex items-center space-x-2 border p-3 rounded hover:bg-muted/50 cursor-pointer"
                                onClick={() => handleCheckChange(item.key as keyof typeof checks, !checks[item.key as keyof typeof checks])}
                            >
                                <Checkbox
                                    id={item.key}
                                    checked={checks[item.key as keyof typeof checks]}
                                    onCheckedChange={(c) => handleCheckChange(item.key as keyof typeof checks, c as boolean)}
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <Label htmlFor={item.key} className="cursor-pointer font-medium">{item.label}</Label>
                                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Report Issue"
                                onClick={() => setActiveIncident({ label: item.label, key: item.key })}
                            >
                                <AlertTriangle className="h-5 w-5" />
                            </Button>
                        </div>
                    ))}
                </div>

                {/* Incident Dialog */}
                {activeIncident && (
                    <ReportIncidentDialog
                        isOpenControlled={true}
                        onOpenChangeControlled={(open) => !open && setActiveIncident(null)}
                        initialDescription={`Issue with: ${activeIncident.label}`}
                    />
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!allChecked}>
                        Confirm & Start Route
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
