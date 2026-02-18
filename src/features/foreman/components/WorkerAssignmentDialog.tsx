
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { WorkerORM, WorkerStatus, WorkerRole } from "@/sdk/database/orm/orm_worker";
import { JobWorkerAssignmentORM } from "@/sdk/database/orm/orm_job_worker_assignment";
import { useCreaoAuth } from "@/sdk/core/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface WorkerAssignmentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    jobId: string;
    jobTitle: string;
}

export function WorkerAssignmentDialog({ isOpen, onClose, jobId, jobTitle }: WorkerAssignmentDialogProps) {
    const { companyId } = useCreaoAuth();
    const queryClient = useQueryClient();
    const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch All Workers
    const { data: workers = [] } = useQuery({
        queryKey: ["workers", companyId],
        enabled: !!companyId && isOpen,
        queryFn: async () => {
            if (!companyId) return [];
            return await WorkerORM.getInstance().getWorkersByCompanyId(companyId);
        }
    });

    // Fetch Current Assignments
    const { data: assignments } = useQuery({
        queryKey: ["job-assignments", jobId],
        enabled: !!jobId && isOpen && !!companyId,
        queryFn: async () => {
            if (!companyId) return [];
            return await JobWorkerAssignmentORM.getInstance().getJobWorkerAssignmentByJobId(jobId, companyId);
        }
    });

    // ... (useEffect remains same)

    // Save Mutation
    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!companyId) throw new Error("No company ID");
            setIsSaving(true);
            const orm = JobWorkerAssignmentORM.getInstance();

            // 1. Delete existing assignments for this job (scoped by company)
            await orm.deleteJobWorkerAssignmentByJobId(jobId, companyId);

            // 2. Insert new assignments
            if (selectedWorkerIds.length > 0) {
                const newAssignments = selectedWorkerIds.map(workerId => ({
                    company_id: companyId,
                    job_id: jobId,
                    worker_id: workerId,
                    // IDs/Timestamps handled by ORM
                }));
                await orm.insertJobWorkerAssignment(newAssignments as any);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["job-assignments", jobId] });
            queryClient.invalidateQueries({ queryKey: ["all-assignments", companyId] });
            onClose();
        },
        onError: (err) => {
            console.error("Failed to save assignments:", err);
            alert("Failed to save crew assignments.");
        },
        onSettled: () => {
            setIsSaving(false);
        }
    });

    const toggleWorker = (workerId: string) => {
        setSelectedWorkerIds(prev =>
            prev.includes(workerId)
                ? prev.filter(id => id !== workerId)
                : [...prev, workerId]
        );
    };

    const activeWorkers = workers.filter(w => w.status === WorkerStatus.Active);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Assign Crew</DialogTitle>
                    <p className="text-sm text-muted-foreground">Select workers for {jobTitle}</p>
                </DialogHeader>

                <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    {activeWorkers.length === 0 ? (
                        <p className="text-center text-muted-foreground">No active workers found.</p>
                    ) : (
                        activeWorkers.map(worker => (
                            <div key={worker.id} className="flex items-center space-x-4 border p-3 rounded-lg">
                                <Checkbox
                                    id={`worker-${worker.id}`}
                                    checked={selectedWorkerIds.includes(worker.id)}
                                    onCheckedChange={() => toggleWorker(worker.id)}
                                />
                                <Label htmlFor={`worker-${worker.id}`} className="flex items-center gap-3 cursor-pointer flex-1">
                                    <Avatar>
                                        <AvatarFallback>{worker.full_name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-medium">{worker.full_name}</div>
                                        <div className="text-xs text-muted-foreground capitalize">{WorkerRole[worker.role]}</div>
                                    </div>
                                </Label>
                            </div>
                        ))
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={() => saveMutation.mutate()} disabled={isSaving}>
                        {isSaving ? "Saving..." : "Save Assignments"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
