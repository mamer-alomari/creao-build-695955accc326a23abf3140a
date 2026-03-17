import { type JobModel, type JobStop, type JobStopType, JobStatus } from "@/sdk/database/orm/orm_job";

/**
 * Returns stops from a job, synthesizing from legacy fields if no stops array exists.
 */
export function getStopsFromJob(job: JobModel): JobStop[] {
  if (job.stops && job.stops.length > 0) {
    return [...job.stops].sort((a, b) => a.sequence - b.sequence);
  }

  // Synthesize from legacy pickup/dropoff
  const stops: JobStop[] = [];
  if (job.pickup_address) {
    stops.push({
      id: "legacy-pickup",
      address: job.pickup_address,
      type: "pickup",
      sequence: 0,
      status: deriveStopStatusFromJobStatus(job.status, "pickup"),
    });
  }
  if (job.dropoff_address) {
    stops.push({
      id: "legacy-dropoff",
      address: job.dropoff_address,
      type: "dropoff",
      sequence: 1,
      status: deriveStopStatusFromJobStatus(job.status, "dropoff"),
    });
  }
  return stops;
}

function deriveStopStatusFromJobStatus(jobStatus: JobStatus, stopType: JobStopType): JobStop["status"] {
  if (stopType === "pickup") {
    if (jobStatus >= JobStatus.onWayToDropoff) return "completed";
    if (jobStatus === JobStatus.Loading) return "loading";
    if (jobStatus === JobStatus.Arrived) return "arrived";
    if (jobStatus === JobStatus.EnRoute) return "en_route";
    return "pending";
  }
  // dropoff
  if (jobStatus >= JobStatus.Completed) return "completed";
  if (jobStatus === JobStatus.Unloading) return "unloading";
  if (jobStatus === JobStatus.onWayToDropoff) return "en_route";
  return "pending";
}

/**
 * Returns the current stop based on current_stop_index.
 */
export function getCurrentStop(job: JobModel): JobStop | undefined {
  const stops = getStopsFromJob(job);
  const idx = job.current_stop_index ?? 0;
  return stops[idx];
}

/**
 * Returns the next stop after current, or undefined if at the last stop.
 */
export function getNextStop(job: JobModel): JobStop | undefined {
  const stops = getStopsFromJob(job);
  const idx = (job.current_stop_index ?? 0) + 1;
  return stops[idx];
}

/**
 * Returns true if the current stop is the last stop.
 */
export function isLastStop(job: JobModel): boolean {
  const stops = getStopsFromJob(job);
  const idx = job.current_stop_index ?? 0;
  return idx >= stops.length - 1;
}

/**
 * Returns a new job with the specified stop updated.
 */
export function updateStopInJob(job: JobModel, stopId: string, updates: Partial<JobStop>): JobModel {
  const stops = getStopsFromJob(job);
  const updatedStops = stops.map((s) =>
    s.id === stopId ? { ...s, ...updates } : s
  );
  return { ...job, stops: updatedStops };
}

/**
 * Inserts a new stop at the given position (defaults to end), resequences.
 */
export function addStopToJob(job: JobModel, stop: JobStop, position?: number): JobModel {
  const stops = getStopsFromJob(job);
  const pos = position ?? stops.length;
  const newStops = [...stops];
  newStops.splice(pos, 0, stop);
  return { ...job, stops: resequence(newStops) };
}

/**
 * Removes a stop by ID and resequences.
 */
export function removeStopFromJob(job: JobModel, stopId: string): JobModel {
  const stops = getStopsFromJob(job).filter((s) => s.id !== stopId);
  return { ...job, stops: resequence(stops) };
}

/**
 * Marks current stop as completed and advances current_stop_index.
 */
export function advanceToNextStop(job: JobModel): JobModel {
  const stops = getStopsFromJob(job);
  const idx = job.current_stop_index ?? 0;

  const updatedStops = stops.map((s, i) => {
    if (i === idx) {
      return { ...s, status: "completed" as const, actual_departure_time: new Date().toISOString() };
    }
    return s;
  });

  return {
    ...job,
    stops: updatedStops,
    current_stop_index: Math.min(idx + 1, stops.length - 1),
  };
}

/**
 * Derives an overall JobStatus from the aggregate stop states.
 */
export function deriveJobStatusFromStops(stops: JobStop[]): JobStatus {
  if (stops.length === 0) return JobStatus.Unspecified;

  const allCompleted = stops.every((s) => s.status === "completed");
  if (allCompleted) return JobStatus.Completed;

  const allPending = stops.every((s) => s.status === "pending");
  if (allPending) return JobStatus.Booked;

  // Find the first non-completed stop to determine current phase
  const activeStop = stops.find((s) => s.status !== "completed");
  if (!activeStop) return JobStatus.Completed;

  switch (activeStop.status) {
    case "en_route":
      return activeStop.type === "pickup" ? JobStatus.EnRoute : JobStatus.onWayToDropoff;
    case "arrived":
      return JobStatus.Arrived;
    case "loading":
      return JobStatus.Loading;
    case "unloading":
      return JobStatus.Unloading;
    default:
      return JobStatus.InProgress;
  }
}

function resequence(stops: JobStop[]): JobStop[] {
  return stops.map((s, i) => ({ ...s, sequence: i }));
}

/**
 * Generates a unique stop ID.
 */
export function generateStopId(): string {
  return `stop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
