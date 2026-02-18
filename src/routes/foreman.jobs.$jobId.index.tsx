import { useState, useEffect } from 'react'
import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { JobORM, JobStatus, type JobModel } from '@/sdk/database/orm/orm_job'
import { CompanyORM } from '@/sdk/database/orm/orm_company'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, MapPin, Calendar, Clock, CheckCircle2, Truck, Navigation, Loader2, Camera } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { VehicleChecklistDialog } from '@/features/foreman/components/VehicleChecklistDialog'
import { MapRouteView } from '@/components/ui/MapRouteView'

export const Route = createFileRoute('/foreman/jobs/$jobId/')({
    component: ForemanJobView,
})

export function ForemanJobView() {
    const { jobId } = Route.useParams()
    const navigate = Route.useNavigate()
    const queryClient = useQueryClient()
    const [isChecklistOpen, setIsChecklistOpen] = useState(false)
    const [currentLocation, setCurrentLocation] = useState<any | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);

    // Get current location
    useEffect(() => {
        console.log("ForemanJobView: Requesting geolocation...");
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log("ForemanJobView: Location received", position.coords);
                    setCurrentLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                    setLocationError(null);
                },
                (error) => {
                    console.error("ForemanJobView: Error getting location", error);
                    let errorMessage = "Error getting location";
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = "Location permission denied. Please enable location services.";
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = "Location information is unavailable.";
                            break;
                        case error.TIMEOUT:
                            errorMessage = "The request to get user location timed out.";
                            break;
                    }
                    setLocationError(errorMessage);
                }
            );
        } else {
            console.error("ForemanJobView: Geolocation not supported");
            setLocationError("Geolocation is not supported by this browser.");
        }
    }, []);

    const { data: queryResult, isLoading } = useQuery({
        queryKey: ['job', jobId],
        queryFn: async () => {
            const orm = JobORM.getInstance()
            const jobs = await orm.getJobById(jobId)
            const jobData = jobs[0] || null

            let warehouseAddress = "Home Warehouse"; // Default fallback
            if (jobData && jobData.classification === 'interstate' && jobData.company_id) {
                try {
                    const companyOrm = CompanyORM.getInstance();
                    const companies = await companyOrm.getCompanyById(jobData.company_id);
                    if (companies.length > 0 && companies[0].warehouse_locations && companies[0].warehouse_locations.length > 0) {
                        // Use first location as nearest for now
                        const firstLocation = companies[0].warehouse_locations[0];
                        if (firstLocation.trim() !== "") {
                            warehouseAddress = firstLocation;
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch warehouse address", e);
                }
            }

            return { job: jobData, warehouseAddress };
        },
    })

    const job = queryResult?.job;
    const warehouseAddress = queryResult?.warehouseAddress;

    const updateJobMutation = useMutation({
        mutationFn: async (updates: Partial<JobModel>) => {
            if (!job) return
            const orm = JobORM.getInstance()
            await orm.setJobById(job.id, { ...job, ...updates })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['job', jobId] })
            toast.success("Job updated")
        },
        onError: () => {
            toast.error("Failed to update job")
        }
    })

    if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
    if (!job) return <div className="p-8 text-center">Job not found</div>

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <div className="mb-6">
                <Button variant="ghost" asChild className="mb-4 pl-0 hover:bg-transparent hover:underline">
                    <Link to="/foreman">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Jobs
                    </Link>
                </Button>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">{job.customer_name}</h1>
                        <p className="text-muted-foreground flex items-center gap-2 mt-1">
                            Job ID: <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{job.id.slice(0, 8)}</span>
                        </p>
                    </div>

                    <Select
                        value={job.status.toString()}
                        onValueChange={(val) => updateJobMutation.mutate({ status: parseInt(val) as JobStatus })}
                        disabled={updateJobMutation.isPending}
                    >
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={JobStatus.Booked.toString()}>Booked</SelectItem>
                            <SelectItem value={JobStatus.EnRoute.toString()}>En Route</SelectItem>
                            <SelectItem value={JobStatus.Arrived.toString()}>Arrived</SelectItem>
                            <SelectItem value={JobStatus.InProgress.toString()}>In Progress</SelectItem>
                            <SelectItem value={JobStatus.Loading.toString()}>Loading</SelectItem>
                            <SelectItem value={JobStatus.onWayToDropoff.toString()}>Driving</SelectItem>
                            <SelectItem value={JobStatus.Unloading.toString()}>Unloading</SelectItem>
                            <SelectItem value={JobStatus.Completed.toString()}>Completed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-primary" />
                                Locations
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="relative border-l-2 border-muted pl-6 pb-6 last:pb-0">
                                <div className="absolute -left-[5px] top-0 h-3 w-3 rounded-full bg-primary" />
                                <h3 className="font-semibold text-sm text-muted-foreground uppercase opacity-70 mb-1">Pickup</h3>
                                <p className="text-lg">{job.pickup_address}</p>
                            </div>
                            <div className="relative border-l-2 border-muted pl-6">
                                <div className="absolute -left-[5px] top-0 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                                <h3 className="font-semibold text-sm text-muted-foreground uppercase opacity-70 mb-1">Dropoff</h3>
                                <p className="text-lg">
                                    {job.classification === 'interstate' ? warehouseAddress : job.dropoff_address}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-primary" />
                                Schedule
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold mb-1">
                                {job.scheduled_date ? new Date(parseInt(job.scheduled_date) * 1000).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Unscheduled'}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-primary" />
                                Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                            <Button variant="outline" className="justify-start" onClick={() => setIsChecklistOpen(true)}>
                                <Truck className="mr-2 h-4 w-4" />
                                Vehicle Checklist
                            </Button>
                            <Button
                                variant="outline"
                                className="justify-start"
                                disabled={job.status !== JobStatus.Arrived}
                                onClick={() => navigate({ to: `/foreman/jobs/${jobId}/inventory` })}
                            >
                                <Camera className="mr-2 h-4 w-4" />
                                Scan Items
                            </Button>
                            <Button
                                variant="outline"
                                className="justify-start"
                                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.pickup_address)}`, '_blank')}
                            >
                                <Navigation className="mr-2 h-4 w-4" />
                                Navigate to Pickup
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Map View */}
                <div className="mt-6 md:col-span-2" id="map-view-card">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Route Preview</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <MapRouteView
                                origin={currentLocation}
                                // @ts-ignore
                                destination={job.pickup_address}
                                className="h-[400px] w-full"
                            />
                            <div className="absolute top-2 right-2 bg-background/90 p-2 rounded text-xs text-muted-foreground z-10">
                                {currentLocation ? "Route from Current Location" : "Locating..."}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <VehicleChecklistDialog
                isOpen={isChecklistOpen}
                onClose={() => setIsChecklistOpen(false)}
                vehicleName="Assigned Vehicle"
                onConfirm={(checklist) => {
                    updateJobMutation.mutate({
                        status: JobStatus.EnRoute,
                        vehicle_checklist: checklist
                    });
                    setIsChecklistOpen(false);
                }}
            />
        </div>
    )
}
