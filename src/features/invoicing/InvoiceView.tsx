import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, FileText, DollarSign, Download } from "lucide-react";
import { type JobModel, JobStatus } from "@/sdk/database/orm/orm_job";
import { type CompanyModel } from "@/sdk/database/orm/orm_company";
import { format } from "date-fns";

interface InvoiceViewProps {
    jobs: JobModel[];
    company: CompanyModel | null | undefined;
}

function fmt(n: number) {
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function InvoiceView({ jobs, company }: InvoiceViewProps) {
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

    const invoiceableJobs = jobs.filter(
        (j) => j.status === JobStatus.Completed || j.status === JobStatus.Unloading
    );

    const selectedJob = invoiceableJobs.find((j) => j.id === selectedJobId);
    const amount = selectedJob
        ? (selectedJob.full_price ?? selectedJob.estimated_cost ?? 0)
        : 0;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Invoicing</h2>
                <p className="text-muted-foreground">Generate and manage invoices for completed jobs</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Job list */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Receipt className="h-4 w-4" />
                            Completed Jobs
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {invoiceableJobs.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">
                                No completed jobs to invoice.
                            </p>
                        ) : (
                            invoiceableJobs.map((job) => (
                                <button
                                    key={job.id}
                                    onClick={() => setSelectedJobId(job.id)}
                                    className={`w-full text-left rounded-lg border p-3 transition-colors hover:bg-accent ${
                                        selectedJobId === job.id ? "border-primary bg-accent" : ""
                                    }`}
                                >
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">{job.customer_name}</p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {job.pickup_address}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {job.scheduled_date
                                                    ? format(new Date(job.scheduled_date), "MMM d, yyyy")
                                                    : "No date"}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-semibold">
                                                {fmt(job.full_price ?? job.estimated_cost ?? 0)}
                                            </p>
                                            <Badge variant="secondary" className="text-xs">
                                                {job.payment_status ?? "pending"}
                                            </Badge>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Invoice preview */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <FileText className="h-4 w-4" />
                            Invoice Preview
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!selectedJob ? (
                            <div className="py-8 text-center text-muted-foreground">
                                <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Select a job to preview invoice</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Header */}
                                <div className="border-b pb-4">
                                    <p className="text-xl font-bold">{company?.name ?? "Moving Company"}</p>
                                    {company?.contact_email && (
                                        <p className="text-sm text-muted-foreground">{company.contact_email}</p>
                                    )}
                                </div>

                                {/* Bill To */}
                                <div>
                                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                                        Bill To
                                    </p>
                                    <p className="text-sm font-medium">{selectedJob.customer_name}</p>
                                </div>

                                {/* Details */}
                                <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Pickup</span>
                                        <span className="font-medium text-right max-w-[60%] truncate">
                                            {selectedJob.pickup_address}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Dropoff</span>
                                        <span className="font-medium text-right max-w-[60%] truncate">
                                            {selectedJob.dropoff_address}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Date</span>
                                        <span className="font-medium">
                                            {selectedJob.scheduled_date
                                                ? format(new Date(selectedJob.scheduled_date), "MMM d, yyyy")
                                                : "—"}
                                        </span>
                                    </div>
                                </div>

                                {/* Total */}
                                <div className="flex justify-between items-center border-t pt-4">
                                    <span className="font-semibold flex items-center gap-1">
                                        <DollarSign className="h-4 w-4" />
                                        Total Due
                                    </span>
                                    <span className="text-2xl font-bold">{fmt(amount)}</span>
                                </div>

                                <Button className="w-full gap-2" disabled>
                                    <Download className="h-4 w-4" />
                                    Download PDF (coming soon)
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
