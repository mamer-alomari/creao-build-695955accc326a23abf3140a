import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { JobORM, JobStatus } from '@/sdk/database/orm/orm_job'
import { JobWorkerAssignmentORM } from '@/sdk/database/orm/orm_job_worker_assignment'
import { useCreaoAuth } from '@/sdk/core/auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, ArrowRight, Truck } from 'lucide-react'

export const Route = createFileRoute('/foreman/')({
  component: ForemanDashboard,
})

function ForemanDashboard() {
  const { user } = useCreaoAuth()

  const { data: assignedJobs, isLoading } = useQuery({
    queryKey: ['foreman-jobs', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return []

      try {
        const jobOrm = JobORM.getInstance()

        // Debug backdoor for testing
        if (user.uid === 'debug-user-123') {
          // Fetch all jobs for debug user
          return await jobOrm.getAllJob()
        }

        // 1. Get assignments
        const assignmentOrm = JobWorkerAssignmentORM.getInstance()
        const assignments = await assignmentOrm.getJobWorkerAssignmentByWorkerId(user.uid)

        if (assignments.length === 0) return []

        // 2. Get jobs
        const jobIds = assignments.map(a => a.job_id)
        // Remove duplicates just in case
        const uniqueJobIds = Array.from(new Set(jobIds))

        // We can use getJobByIDs but it handles chunks.
        // Let's use it.
        const jobs = await jobOrm.getJobByIDs(uniqueJobIds)

        // Sort by date descending (newest first)
        return jobs.sort((a, b) => {
          const dateA = a.scheduled_date ? new Date(parseInt(a.scheduled_date) * 1000).getTime() : 0
          const dateB = b.scheduled_date ? new Date(parseInt(b.scheduled_date) * 1000).getTime() : 0
          return dateB - dateA
        })
      } catch (e) {
        console.error("Error fetching foreman jobs:", e)
        return []
      }
    },
    enabled: !!user?.uid,
  })

  if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Jobs</h1>
          <p className="text-muted-foreground mt-1">Manage your assigned moving jobs</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {assignedJobs?.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-muted/30 rounded-lg border border-dashed">
            <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No jobs assigned</h3>
            <p className="text-muted-foreground">You don't have any upcoming jobs assigned to you.</p>
          </div>
        ) : (
          assignedJobs?.map(job => (
            <Card key={job.id} className="flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <CardTitle className="text-xl line-clamp-1">{job.customer_name || 'Unknown Customer'}</CardTitle>
                    <CardDescription className="line-clamp-1">{job.id.slice(0, 8)}...</CardDescription>
                  </div>
                  <Badge variant={
                    job.status === JobStatus.Completed ? 'secondary' :
                      job.status === JobStatus.Booked ? 'outline' :
                        'default'
                  }>
                    {JobStatus[job.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {job.scheduled_date ? new Date(parseInt(job.scheduled_date) * 1000).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Not scheduled'}
                  </span>
                </div>
                <div className="flex items-start text-sm text-muted-foreground">
                  <MapPin className="mr-2 h-4 w-4 shrink-0 mt-0.5" />
                  <div className="grid gap-1">
                    <span className="line-clamp-1">{job.pickup_address || 'No pickup'}</span>
                    <span className="text-xs text-muted-foreground/60 rotate-90 w-4 h-4 flex justify-center">↓</span>
                    <span className="line-clamp-1">{job.dropoff_address || 'No dropoff'}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-3 border-t bg-muted/5">
                <Button asChild className="w-full">
                  <Link to="/foreman/jobs/$jobId" params={{ jobId: job.id }}>
                    View Job <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
