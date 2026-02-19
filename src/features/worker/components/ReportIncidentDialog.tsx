import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IncidentORM, type IncidentModel } from "@/sdk/database/orm/orm_incident";
import { useCreaoAuth } from "@/sdk/core/auth";
import { AlertCircle, Upload, X } from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

interface ReportIncidentDialogProps {
    trigger?: React.ReactNode;
    initialDescription?: string;
    onClose?: () => void; // Optional callback when dialog closes
    isOpenControlled?: boolean; // Optional controlled state
    onOpenChangeControlled?: (open: boolean) => void;
    jobId?: string;
}

export function ReportIncidentDialog({ trigger, initialDescription = "", onClose, isOpenControlled, onOpenChangeControlled, jobId }: ReportIncidentDialogProps) {
    const { user, companyId } = useCreaoAuth();
    const queryClient = useQueryClient();
    const [internalIsOpen, setInternalIsOpen] = useState(false);

    // Use controlled state if provided, otherwise internal
    const isOpen = isOpenControlled ?? internalIsOpen;
    const setIsOpen = (open: boolean) => {
        if (onOpenChangeControlled) {
            onOpenChangeControlled(open);
        } else {
            setInternalIsOpen(open);
        }
        if (!open && onClose) onClose();
    };

    const [description, setDescription] = useState(initialDescription);
    // Reset description when dialog opens if initialDescription changes
    // (This is a simple way, deeper effect might be needed if props change dynamically while open)
    const [type, setType] = useState<IncidentModel["type"]>("other");
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const uploadFiles = async () => {
        if (files.length === 0) return [];
        console.log("Starting upload of", files.length, "files");
        setIsUploading(true);
        const urls: string[] = [];
        try {
            for (const file of files) {
                console.log("Uploading file:", file.name);
                console.log("Uploading file:", file.name);
                const storageRef = ref(storage, `incident-reports/${companyId}/${Date.now()}_${file.name}`);

                const uploadTask = uploadBytesResumable(storageRef, file);

                const url = await new Promise<string>((resolve, reject) => {
                    uploadTask.on('state_changed',
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            console.log('Upload is ' + progress + '% done');
                            switch (snapshot.state) {
                                case 'paused':
                                    console.log('Upload is paused');
                                    break;
                                case 'running':
                                    console.log('Upload is running');
                                    break;
                            }
                        },
                        (error) => {
                            console.error("Upload Error:", error);
                            // Handle unsuccessful uploads
                            reject(error);
                        },
                        async () => {
                            // Handle successful uploads on complete
                            try {
                                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                                console.log('File available at', downloadURL);
                                resolve(downloadURL);
                            } catch (e) {
                                reject(e);
                            }
                        }
                    );
                });

                urls.push(url);
            }
        } catch (error) {
            console.error("Upload failed details:", error);
            toast.error(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
            throw error;
        } finally {
            setIsUploading(false);
        }
        return urls;
    };

    const createIncidentMutation = useMutation({
        mutationFn: async () => {
            if (!user?.uid || !companyId) throw new Error("Missing user or company information");

            const mediaUrls = await uploadFiles();

            const incidentOrm = IncidentORM.getInstance();
            return await incidentOrm.createIncident({
                type,
                description,
                reported_by: user.uid,
                company_id: companyId,
                job_id: jobId,
                media_urls: mediaUrls,
                photos: [], // Deprecated
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["incidents"] });
            setIsOpen(false);
            setDescription("");
            setType("other");
            setFiles([]);
            setIsUploading(false);
            toast.success("Incident reported successfully.");
        },
        onError: (error) => {
            console.error("Failed to report incident:", error);
            toast.error("Failed to report incident. Please try again.");
        }
    });

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="destructive">
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Report Incident
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Report an Incident</DialogTitle>
                    <DialogDescription>
                        Please provide details about the incident.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="type">Incident Type</Label>
                        <Select value={type} onValueChange={(val: any) => setType(val)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="vehicle_issue">Vehicle Issue</SelectItem>
                                <SelectItem value="injury">Injury</SelectItem>
                                <SelectItem value="damage">Property Damage</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label>Attachments (Images/Video)</Label>
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-2">
                                {files.map((file, i) => (
                                    <div key={i} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-sm">
                                        <span className="truncate max-w-[150px]">{file.name}</span>
                                        <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => removeFile(i)}>
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <Button variant="outline" className="w-full relative" disabled={isUploading}>
                                <Upload className="mr-2 h-4 w-4" />
                                {isUploading ? "Uploading..." : "Add Files"}
                                <input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    multiple
                                    accept="image/*,video/*"
                                    onChange={handleFileChange}
                                    disabled={isUploading}
                                />
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe what happened..."
                            rows={4}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button
                        variant="destructive"
                        onClick={() => createIncidentMutation.mutate()}
                        disabled={!description || createIncidentMutation.isPending}
                    >
                        {createIncidentMutation.isPending ? "Submitting..." : "Submit Report"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
