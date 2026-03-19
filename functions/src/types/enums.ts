// Pure enum definitions — no runtime imports, shared by client and server

export enum JobStatus {
  Unspecified = 0,
  Quote = 1,
  Booked = 2,
  InProgress = 3,
  Completed = 4,
  Canceled = 5,
  EnRoute = 6,
  Arrived = 7,
  Loading = 8,
  onWayToDropoff = 9,
  Unloading = 10,
  ReturningToWarehouse = 11,
}

export type JobStopType = "pickup" | "dropoff" | "storage";
export type JobStopStatus = "pending" | "en_route" | "arrived" | "loading" | "unloading" | "completed";

// ORM WorkerRole — describes the worker's job function (stored on worker documents)
export enum WorkerRole {
  Unspecified = 0,
  Mover = 1,
  Driver = 2,
  Supervisor = 3,
}

// Auth UserRole — describes the user's permission level (stored on auth/user profile)
export enum UserRole {
  Unspecified = "unspecified",
  Customer = "customer",
  Worker = "worker",
  Foreman = "foreman",
  Manager = "manager",
  Admin = "admin",
}

export enum WorkerStatus {
  Unspecified = 0,
  Active = 1,
  Inactive = 2,
}

export enum VehicleType {
  Unspecified = 0,
  BoxTruck16ft = 1,
  BoxTruck26ft = 2,
  CargoVan = 3,
  Flatbed = 4,
}

export enum EquipmentType {
  Unspecified = 0,
  Reusable = 1,
  Consumable = 2,
}

export enum PayrollRecordStatus {
  Unspecified = 0,
  Draft = 1,
  Approved = 2,
  Paid = 3,
}

export enum VehicleScheduleStatus {
  Unspecified = 0,
  Available = 1,
  InUse = 2,
  Maintenance = 3,
}

export enum VehicleScheduleMaintenanceType {
  Unspecified = 0,
  Preventive = 1,
  Repair = 2,
  Inspection = 3,
}

export enum EquipmentScheduleStatus {
  Unspecified = 0,
  Available = 1,
  Reserved = 2,
  InMaintenance = 3,
}

export enum MaintenanceType {
  Unspecified = 0,
  Routine = 1,
  Repair = 2,
  Inspection = 3,
  Upgrade = 4,
}
