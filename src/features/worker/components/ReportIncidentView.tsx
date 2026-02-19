
import { useState } from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useCreaoAuth } from "@/sdk/core/auth";
import { IncidentORM, type IncidentModel } from "@/sdk/database/orm/orm_incident";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, Camera, ArrowLeft } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export function ReportIncidentView() {
    const { user, companyId } = useCreaoAuth();
    const navigate = useNavigate();

    const [type, setType] = useState<"injury" | "damage" | "vehicle_issue" | "other">("damage");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const submitMutation = useMutation({
        mutationFn: async () => {
            if (!user || !companyId) return;

            await IncidentORM.getInstance().createIncident({
                type,
                description,
                reported_by: user.uid,
                company_id: companyId,
                photos: [] // Placeholder for photo upload logic
            });
        },
        onSuccess: () => {
            toast.success("Incident reported successfully.");
            navigate({ to: "/worker" });
        },
        onError: (err) => {
            console.error(err);
            toast.error("Failed to report incident.");
        }
    });

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/worker" })}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-2xl font-bold text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-6 w-6" /> Report Incident
                </h1>
            </div>

            <Card className="border-red-100">
                <CardHeader>
                    <CardTitle>Safety First</CardTitle>
                    <CardDescription>Report any accidents, damages, or injuries immediately.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Incident Type</Label>
                        <Select value={type} onValueChange={(v: any) => setType(v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="damage">Property Damage</SelectItem>
                                <SelectItem value="injury">Personal Injury</SelectItem>
                                <SelectItem value="vehicle_issue">Vehicle Issue</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                            placeholder="Describe what happened..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={5}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Photos</Label>
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => toast.info("Photo upload coming soon")}>
                            <Camera className="h-8 w-8 mb-2" />
                            <span>Tap to add photo</span>
                        </div>
                    </div>

                    <Button
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                        size="lg"
                        onClick={() => submitMutation.mutate()}
                        disabled={submitMutation.isPending || !description}
                    >
                        {submitMutation.isPending ? "Submitting..." : "Submit Report"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
