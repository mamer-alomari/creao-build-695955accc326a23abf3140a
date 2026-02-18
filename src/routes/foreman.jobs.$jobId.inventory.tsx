import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { JobORM, JobStatus, type JobModel } from "@/sdk/database/orm/orm_job";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Plus, Camera, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useCreaoAuth } from "@/sdk/core/auth";

export const Route = createFileRoute('/foreman/jobs/$jobId/inventory')({
  component: ForemanInventoryView,
})

export function ForemanInventoryView() {
  const { jobId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useCreaoAuth();

  // Mock local state for items (in real app, this would be complex state/context)
  const [items, setItems] = useState<string[]>([]);

  const { data: job, isLoading } = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const res = await JobORM.getInstance().getJobById(jobId);
      const jobData = res[0];

      // Initialize items from existing quote or final inventory
      if (jobData) {
        const initialData = jobData.final_inventory_data || jobData.inventory_data || "[]";
        try {
          const parsed = JSON.parse(initialData);
          // Simplify for this view: just list of names/ids for now if complex object
          // Assuming string[] or simple objects for now.
          // For demo, if it's empty, we start with empty.
          if (Array.isArray(parsed)) {
            setItems(parsed.map((i: any) => typeof i === 'string' ? i : i.name || "Unknown Item"));
          }
        } catch (e) {
          console.error("Failed to parse inventory", e);
        }
      }
      return jobData;
    }
  });

  const updateJobMutation = useMutation({
    mutationFn: async (updates: Partial<JobModel>) => {
      if (!job) return;
      await JobORM.getInstance().setJobById(job.id, { ...job, ...updates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
    }
  });

  const handleAddItem = () => {
    const newItem = `Item #${items.length + 1}`;
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleComplete = () => {
    updateJobMutation.mutate({
      final_inventory_data: JSON.stringify(items),
      // Ensure status allows moving to Quote/Loading. 
      // If strictly following flow, maybe just save data.
      // ForemanJobExecution will handle step transition based on local state or job data.
    }, {
      onSuccess: () => {
        toast.success("Inventory Saved");
        // Navigate back to Execution flow, ideally defaulting to 'quote' step
        // We might need to pass a query param or ForemanJobExecution needs to be smart enough
        // to see final_inventory_data exists and default to 'quote'.
        navigate({ to: `/foreman/jobs/${jobId}/execute` });
      }
    });
  };

  if (isLoading || !job) return <div className="p-8 text-center">Loading Inventory...</div>;

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl pb-24">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: `/foreman/jobs/${jobId}` })}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">Job: {job.customer_name}</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" /> Scanned Items ({items.length})
          </CardTitle>
          <Button size="sm" onClick={handleAddItem}>
            <Plus className="h-4 w-4 mr-1" /> Add Manual
          </Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              No items scanned yet. Use camera or add manually.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded border">
                  <span>{item}</span>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button className="w-full h-12 text-lg" onClick={() => toast("Camera Scan Feature (Mock)")}>
            <Camera className="mr-2" /> Open AI Camera Scanner
          </Button>
        </CardFooter>
      </Card>

      {/* Sticky Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-lg md:relative md:bg-transparent md:border-0 md:shadow-none md:p-0">
        <div className="max-w-3xl mx-auto">
          <Button
            size="lg"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
            onClick={handleComplete}
          >
            <CheckCircle2 className="mr-2" /> Complete & Continue to Quote
          </Button>
        </div>
      </div>
    </div>
  );
}
