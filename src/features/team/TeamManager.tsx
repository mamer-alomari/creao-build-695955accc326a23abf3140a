
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCreaoAuth } from "@/sdk/core/auth";
import { InvitationORM, type InvitationModel } from "@/sdk/database/orm/orm_invitation";
import { WorkerORM } from "@/sdk/database/orm/orm_worker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, UserPlus, Copy, X } from "lucide-react";
import { format, addDays } from "date-fns";

export function TeamManager() {
    const { user, companyId } = useCreaoAuth();
    const queryClient = useQueryClient();
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteName, setInviteName] = useState(""); // Not stored in invite model currently, but useful UI
    const [generatedLink, setGeneratedLink] = useState("");

    // Fetch Workers
    const { data: workers = [] } = useQuery({
        queryKey: ["workers", companyId],
        enabled: !!companyId,
        queryFn: async () => {
            if (!companyId) return [];
            return await WorkerORM.getInstance().getWorkerByCompanyId(companyId);
        }
    });

    // Fetch Pending Invitations
    const { data: invitations = [] } = useQuery({
        queryKey: ["invitations", companyId],
        enabled: !!companyId,
        queryFn: async () => {
            if (!companyId) return [];
            return await InvitationORM.getInstance().getPendingInvitationsByCompany(companyId);
        }
    });

    // Create Invite Mutation
    const createInviteMutation = useMutation({
        mutationFn: async () => {
            if (!companyId || !user) return;

            // Expire in 7 days
            const expires = addDays(new Date(), 7).toISOString();

            const invite = await InvitationORM.getInstance().createInvitation({
                email: inviteEmail,
                role: "worker",
                company_id: companyId,
                expires_at: expires,
                created_by: user.uid
            });

            // Generate Link
            const url = `${window.location.origin}/invite?token=${invite.id}`;
            return url;
        },
        onSuccess: (url) => {
            if (url) {
                setGeneratedLink(url);
                queryClient.invalidateQueries({ queryKey: ["invitations"] });
            }
        },
        onError: (err) => {
            alert("Failed to create invitation");
            console.error(err);
        }
    });

    const copyLink = () => {
        navigator.clipboard.writeText(generatedLink);
        alert("Link copied to clipboard!");
        setIsInviteOpen(false);
        setGeneratedLink("");
        setInviteEmail("");
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Team Management</h2>
                    <p className="text-muted-foreground">Manage your workers and field staff.</p>
                </div>
                <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Invite Worker
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Invite New Worker</DialogTitle>
                            <DialogDescription>
                                Verify the email address. They will receive a link to set up their account.
                            </DialogDescription>
                        </DialogHeader>

                        {!generatedLink ? (
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Name (Optional)</Label>
                                    <Input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="John Doe" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email Address</Label>
                                    <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="worker@example.com" />
                                </div>
                                <Button
                                    className="w-full"
                                    onClick={() => createInviteMutation.mutate()}
                                    disabled={createInviteMutation.isPending || !inviteEmail}
                                >
                                    {createInviteMutation.isPending ? "Generating..." : "Generate Invitation Link"}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4 py-4">
                                <div className="p-4 bg-green-50 text-green-700 rounded-md border border-green-200">
                                    <div className="font-semibold flex items-center gap-2">
                                        <Plus className="h-4 w-4" /> Invitation Created!
                                    </div>
                                    <p className="text-sm mt-1">Send this link to the worker:</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Input value={generatedLink} readOnly />
                                    <Button size="icon" variants="outline" onClick={copyLink}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>

            {/* Pending Invitations */}
            {invitations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Pending Invitations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Expires</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invitations.map(invite => (
                                    <TableRow key={invite.id}>
                                        <TableCell>{invite.email}</TableCell>
                                        <TableCell>{format(new Date(invite.create_time), "PP")}</TableCell>
                                        <TableCell>{format(new Date(invite.expires_at), "PP")}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="sm" className="text-red-500">
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Workers List */}
            <Card>
                <CardHeader>
                    <CardTitle>Active Workers</CardTitle>
                </CardHeader>
                <CardContent>
                    {workers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No workers added yet. Invite someone to get started.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {workers.map(worker => (
                                    <TableRow key={worker.id}>
                                        <TableCell className="font-medium">{worker.name}</TableCell>
                                        <TableCell><Badge variant="outline">{worker.role}</Badge></TableCell>
                                        <TableCell><Badge className="bg-green-500">Active</Badge></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
