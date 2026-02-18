
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCreaoAuth } from "@/sdk/core/auth";
import { IncidentORM, type IncidentModel } from "@/sdk/database/orm/orm_incident";
import { WorkerORM } from "@/sdk/database/orm/orm_worker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle, Clock, FileText, ExternalLink } from "lucide-react";

export function IncidentsView() {
    const { companyId } = useCreaoAuth();
    const queryClient = useQueryClient();

    // Fetch Incidents
    const { data: incidents = [], isLoading } = useQuery({
        queryKey: ["incidents", companyId],
        enabled: !!companyId,
        queryFn: async () => {
            if (!companyId) return [];
            return await IncidentORM.getInstance().getIncidentsByCompany(companyId);
        }
    });

    // Fetch Workers for name resolution
    const { data: workers = [] } = useQuery({
        queryKey: ["workers", companyId],
        enabled: !!companyId,
        queryFn: async () => {
            if (!companyId) return [];
            return await WorkerORM.getInstance().getWorkersByCompanyId(companyId);
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: IncidentModel["status"] }) => {
            const incident = incidents.find(i => i.id === id);
            if (!incident) throw new Error("Incident not found");

            return await IncidentORM.getInstance().updateIncident({
                ...incident,
                status
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["incidents"] });
        }
    });

    const getWorkerName = (id: string) => {
        const worker = workers.find(w => w.id === id);
        return worker ? worker.full_name : "Unknown Worker";
    };

    const getStatusBadge = (status: IncidentModel["status"]) => {
        switch (status) {
            case "open":
                return <Badge variant="destructive" className="flex w-fit items-center gap-1"><AlertTriangle className="h-3 w-3" /> Open</Badge>;
            case "investigating":
                return <Badge variant="secondary" className="flex w-fit items-center gap-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-200"><Clock className="h-3 w-3" /> Investigating</Badge>;
            case "resolved":
                return <Badge variant="default" className="flex w-fit items-center gap-1 bg-green-100 text-green-800 hover:bg-green-200"><CheckCircle className="h-3 w-3" /> Resolved</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (isLoading) return <div>Loading incidents...</div>;

    const sortedIncidents = [...incidents].sort((a, b) => new Date(b.create_time).getTime() - new Date(a.create_time).getTime());

    return (
        <Card>
            <CardHeader>
                <CardTitle>Incidents & Reports</CardTitle>
                <CardDescription>Review and manage incidents reported by your team.</CardDescription>
            </CardHeader>
            <CardContent>
                {sortedIncidents.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        No incidents reported.
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Reported By</TableHead>
                                <TableHead className="w-[300px]">Description</TableHead>
                                <TableHead>Media</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedIncidents.map((incident) => (
                                <TableRow key={incident.id}>
                                    <TableCell>{format(new Date(incident.create_time), "MMM d, yyyy")}</TableCell>
                                    <TableCell className="capitalize">{incident.type.replace("_", " ")}</TableCell>
                                    <TableCell>{getWorkerName(incident.reported_by)}</TableCell>
                                    <TableCell className="max-w-[300px] truncate" title={incident.description}>
                                        {incident.description}
                                    </TableCell>
                                    <TableCell>
                                        {incident.media_urls && incident.media_urls.length > 0 ? (
                                            <div className="flex gap-1">
                                                {incident.media_urls.map((url, i) => (
                                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                                                        <FileText className="h-4 w-4" />
                                                    </a>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">No media</span>
                                        )}
                                    </TableCell>
                                    <TableCell>{getStatusBadge(incident.status)}</TableCell>
                                    <TableCell className="text-right">
                                        <Select
                                            value={incident.status}
                                            onValueChange={(val) => updateStatusMutation.mutate({ id: incident.id, status: val as IncidentModel["status"] })}
                                        >
                                            <SelectTrigger className="w-[140px] ml-auto h-8">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="open">Open</SelectItem>
                                                <SelectItem value="investigating">Investigating</SelectItem>
                                                <SelectItem value="resolved">Resolved</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
