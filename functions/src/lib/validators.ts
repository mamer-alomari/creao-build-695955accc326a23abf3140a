import { z } from "zod";
import {
  JobStatus,
  UserRole,
  WorkerRole,
  WorkerStatus,
  VehicleType,
  EquipmentType,
  PayrollRecordStatus,
  VehicleScheduleStatus,
  EquipmentScheduleStatus,
  VehicleScheduleMaintenanceType,
} from "../types/enums";

// --- Jobs ---
export const CreateJobSchema = z.object({
  company_id: z.string().min(1),
  customer_name: z.string().min(1),
  scheduled_date: z.string().min(1),
  pickup_address: z.string().min(1),
  dropoff_address: z.string().min(1),
  estimated_cost: z.number().optional(),
  distance: z.string().optional(),
  customer_id: z.string().optional(),
  inventory_data: z.string().optional(),
  stops: z.array(z.object({
    address: z.string(),
    type: z.enum(["pickup", "dropoff", "storage"]),
    sequence: z.number(),
    actual_arrival_time: z.string().optional(),
    actual_departure_time: z.string().optional(),
    inventory_loaded: z.string().optional(),
    inventory_unloaded: z.string().optional(),
    photos: z.array(z.string()).optional(),
    signatures: z.object({
      customer_sign: z.string().optional(),
      foreman_sign: z.string().optional(),
      timestamp: z.string().optional(),
    }).optional(),
    notes: z.string().optional(),
  })).optional(),
});

export const UpdateJobSchema = z.object({
  id: z.string().min(1),
  customer_name: z.string().optional(),
  scheduled_date: z.string().optional(),
  pickup_address: z.string().optional(),
  dropoff_address: z.string().optional(),
  estimated_cost: z.number().optional(),
  distance: z.string().optional(),
  inventory_data: z.string().optional(),
  closing_notes: z.string().optional(),
  final_quote_amount: z.number().optional(),
  payment_status: z.enum(["pending", "deposit_paid", "fully_paid"]).optional(),
  deposit_amount: z.number().optional(),
});

export const UpdateJobStatusSchema = z.object({
  id: z.string().min(1),
  status: z.nativeEnum(JobStatus),
});

export const ListByCompanySchema = z.object({
  company_id: z.string().min(1),
});

export const GetByIdSchema = z.object({
  id: z.string().min(1),
});

export const DeleteByIdSchema = z.object({
  id: z.string().min(1),
});

export const GetJobsByStatusSchema = z.object({
  company_id: z.string().min(1),
  status: z.nativeEnum(JobStatus),
});

export const GetJobsByDateRangeSchema = z.object({
  company_id: z.string().min(1),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
});

export const GetJobsByCustomerSchema = z.object({
  company_id: z.string().min(1),
  customer_name: z.string().min(1),
});

// --- Workers ---
export const CreateWorkerSchema = z.object({
  company_id: z.string().min(1),
  full_name: z.string().min(1),
  role: z.nativeEnum(WorkerRole),
  status: z.nativeEnum(WorkerStatus).optional(),
  hourly_rate: z.number().optional(),
  email: z.string().email().optional(),
  phone_number: z.string().optional(),
  can_self_schedule: z.boolean().optional(),
});

export const UpdateWorkerSchema = z.object({
  id: z.string().min(1),
  full_name: z.string().optional(),
  role: z.nativeEnum(WorkerRole).optional(),
  status: z.nativeEnum(WorkerStatus).optional(),
  hourly_rate: z.number().optional(),
  email: z.string().email().optional(),
  phone_number: z.string().optional(),
  can_self_schedule: z.boolean().optional(),
});

// --- Vehicles ---
export const CreateVehicleSchema = z.object({
  company_id: z.string().min(1),
  vehicle_name: z.string().min(1),
  license_plate: z.string().min(1),
  type: z.nativeEnum(VehicleType),
  capacity_cft: z.number().optional(),
});

export const UpdateVehicleSchema = z.object({
  id: z.string().min(1),
  vehicle_name: z.string().optional(),
  license_plate: z.string().optional(),
  type: z.nativeEnum(VehicleType).optional(),
  capacity_cft: z.number().optional(),
});

// --- Equipment ---
export const CreateEquipmentSchema = z.object({
  company_id: z.string().min(1),
  name: z.string().min(1),
  total_quantity: z.number().int().min(0),
  type: z.nativeEnum(EquipmentType),
  description: z.string().optional(),
});

export const UpdateEquipmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  total_quantity: z.number().int().min(0).optional(),
  type: z.nativeEnum(EquipmentType).optional(),
  description: z.string().optional(),
});

// --- Quotes ---
export const CreateQuoteSchema = z.object({
  company_id: z.string().min(1),
  pickup_address: z.string().min(1),
  dropoff_address: z.string().min(1),
  move_date: z.string().min(1),
  inventory_items: z.array(z.any()),
  estimated_volume: z.number(),
  estimated_price_min: z.number(),
  estimated_price_max: z.number(),
  customer_name: z.string().min(1),
  customer_email: z.string().email(),
  customer_phone: z.string().min(1),
  customer_id: z.string().optional(),
  stops: z.array(z.object({
    address: z.string(),
    type: z.enum(["pickup", "dropoff", "storage"]),
  })).optional(),
  expires_at: z.string().optional(),
});

export const UpdateQuoteSchema = z.object({
  id: z.string().min(1),
  pickup_address: z.string().optional(),
  dropoff_address: z.string().optional(),
  move_date: z.string().optional(),
  inventory_items: z.array(z.any()).optional(),
  estimated_volume: z.number().optional(),
  estimated_price_min: z.number().optional(),
  estimated_price_max: z.number().optional(),
  customer_name: z.string().optional(),
  customer_email: z.string().email().optional(),
  customer_phone: z.string().optional(),
});

export const UpdateQuoteStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["PENDING", "BOOKED", "ARCHIVED"]),
});

export const CalculateAIQuoteSchema = z.object({
  rooms: z.array(z.object({
    roomName: z.string(),
    roomType: z.string().optional(),
    items: z.array(z.object({
      name: z.string(),
      quantity: z.number(),
      estimatedSize: z.string().optional(),
      weightLbs: z.number().optional(),
      volumeCuFt: z.number().optional(),
    })),
  })),
  distance: z.union([z.string(), z.number()]).optional(),
  classification: z.string().optional(),
});

// --- Scheduling ---
export const AssignWorkerToJobSchema = z.object({
  company_id: z.string().min(1),
  job_id: z.string().min(1),
  worker_id: z.string().min(1),
});

export const UnassignWorkerFromJobSchema = z.object({
  company_id: z.string().min(1),
  job_id: z.string().min(1),
  worker_id: z.string().min(1),
});

export const AssignVehicleToJobSchema = z.object({
  company_id: z.string().min(1),
  job_id: z.string().min(1),
  vehicle_id: z.string().min(1),
});

export const UnassignVehicleFromJobSchema = z.object({
  company_id: z.string().min(1),
  job_id: z.string().min(1),
  vehicle_id: z.string().min(1),
});

export const AllocateEquipmentToJobSchema = z.object({
  company_id: z.string().min(1),
  job_id: z.string().min(1),
  equipment_id: z.string().min(1),
  quantity: z.number().int().min(1),
});

export const DeallocateEquipmentFromJobSchema = z.object({
  company_id: z.string().min(1),
  job_id: z.string().min(1),
  equipment_id: z.string().min(1),
});

export const SetWorkerScheduleSchema = z.object({
  worker_id: z.string().min(1),
  company_id: z.string().min(1),
  date: z.string().min(1),
  is_available: z.boolean(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  notes: z.string().optional(),
});

export const SetVehicleScheduleSchema = z.object({
  vehicle_id: z.string().min(1),
  company_id: z.string().min(1),
  schedule_date: z.string().min(1),
  status: z.nativeEnum(VehicleScheduleStatus),
  maintenance_type: z.nativeEnum(VehicleScheduleMaintenanceType).optional(),
});

export const SetEquipmentScheduleSchema = z.object({
  equipment_id: z.string().min(1),
  company_id: z.string().min(1),
  schedule_date: z.string().min(1),
  status: z.nativeEnum(EquipmentScheduleStatus),
  reason: z.string().optional(),
});

export const GetScheduleRangeSchema = z.object({
  resource_id: z.string().min(1),
  company_id: z.string().min(1),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
});

// --- Incidents ---
export const CreateIncidentSchema = z.object({
  company_id: z.string().min(1),
  type: z.enum(["injury", "damage", "vehicle_issue", "other"]),
  description: z.string().min(1),
  job_id: z.string().optional(),
  reported_by: z.string().min(1),
});

export const UpdateIncidentSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["open", "investigating", "resolved"]).optional(),
  description: z.string().optional(),
});

// --- Payroll ---
export const CreatePayrollRecordSchema = z.object({
  company_id: z.string().min(1),
  worker_id: z.string().min(1),
  pay_period_start: z.string().min(1),
  pay_period_end: z.string().min(1),
  hourly_wage: z.number().min(0),
  hours_worked: z.number().min(0),
});

export const UpdatePayrollRecordSchema = z.object({
  id: z.string().min(1),
  hourly_wage: z.number().min(0).optional(),
  hours_worked: z.number().min(0).optional(),
  status: z.nativeEnum(PayrollRecordStatus).optional(),
});

// --- Invitations ---
export const CreateInvitationSchema = z.object({
  company_id: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional(),
  phone_number: z.string().optional(),
  role: z.enum(["worker", "manager"]),
  expires_at: z.string().optional(),
});

export const UpdateInvitationStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["pending", "accepted"]),
});

// --- Company ---
export const UpdateCompanySchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  license_number: z.string().optional(),
  contact_email: z.string().email().optional(),
  warehouse_locations: z.array(z.string()).optional(),
});

// --- Analytics ---
export const GetAvailableWorkersSchema = z.object({
  company_id: z.string().min(1),
  date: z.string().min(1),
});

export const DateRangeSchema = z.object({
  company_id: z.string().min(1),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
});

export const GetUpcomingJobsSchema = z.object({
  company_id: z.string().min(1),
  days: z.number().int().min(1).max(90),
});

// --- API Keys ---
export const CreateApiKeySchema = z.object({
  company_id: z.string().min(1),
  name: z.string().min(1).max(100),
  role: z.nativeEnum(UserRole),
});

export const RevokeApiKeySchema = z.object({
  id: z.string().min(1),
});
