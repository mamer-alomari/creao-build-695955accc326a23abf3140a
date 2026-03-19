// Action input/output types for the orchestration layer

import { JobStatus, UserRole, WorkerRole, WorkerStatus, VehicleType, EquipmentType, PayrollRecordStatus } from "./enums";
import { JobStop } from "./models";

// --- Jobs ---
export interface CreateJobInput {
  company_id: string;
  customer_name: string;
  scheduled_date: string;
  pickup_address: string;
  dropoff_address: string;
  estimated_cost?: number;
  distance?: string;
  customer_id?: string;
  inventory_data?: string;
  stops?: Omit<JobStop, "id" | "status">[];
}

export interface UpdateJobInput {
  id: string;
  customer_name?: string;
  scheduled_date?: string;
  pickup_address?: string;
  dropoff_address?: string;
  estimated_cost?: number;
  distance?: string;
  inventory_data?: string;
  closing_notes?: string;
  final_quote_amount?: number;
  payment_status?: "pending" | "deposit_paid" | "fully_paid";
  deposit_amount?: number;
}

export interface UpdateJobStatusInput {
  id: string;
  status: JobStatus;
}

export interface ListByCompanyInput {
  company_id: string;
}

export interface GetByIdInput {
  id: string;
}

export interface DeleteByIdInput {
  id: string;
}

export interface GetJobsByStatusInput {
  company_id: string;
  status: JobStatus;
}

export interface GetJobsByDateRangeInput {
  company_id: string;
  start_date: string;
  end_date: string;
}

export interface GetJobsByCustomerInput {
  company_id: string;
  customer_name: string;
}

// --- Workers ---
export interface CreateWorkerInput {
  company_id: string;
  full_name: string;
  role: WorkerRole;
  status?: WorkerStatus;
  hourly_rate?: number;
  email?: string;
  phone_number?: string;
  can_self_schedule?: boolean;
}

export interface UpdateWorkerInput {
  id: string;
  full_name?: string;
  role?: WorkerRole;
  status?: WorkerStatus;
  hourly_rate?: number;
  email?: string;
  phone_number?: string;
  can_self_schedule?: boolean;
}

// --- Vehicles ---
export interface CreateVehicleInput {
  company_id: string;
  vehicle_name: string;
  license_plate: string;
  type: VehicleType;
  capacity_cft?: number;
}

export interface UpdateVehicleInput {
  id: string;
  vehicle_name?: string;
  license_plate?: string;
  type?: VehicleType;
  capacity_cft?: number;
}

// --- Equipment ---
export interface CreateEquipmentInput {
  company_id: string;
  name: string;
  total_quantity: number;
  type: EquipmentType;
  description?: string;
}

export interface UpdateEquipmentInput {
  id: string;
  name?: string;
  total_quantity?: number;
  type?: EquipmentType;
  description?: string;
}

// --- Quotes ---
export interface CreateQuoteInput {
  company_id: string;
  pickup_address: string;
  dropoff_address: string;
  move_date: string;
  inventory_items: any[];
  estimated_volume: number;
  estimated_price_min: number;
  estimated_price_max: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_id?: string;
  stops?: Array<{ address: string; type: "pickup" | "dropoff" | "storage" }>;
  expires_at?: string;
}

export interface UpdateQuoteInput {
  id: string;
  pickup_address?: string;
  dropoff_address?: string;
  move_date?: string;
  inventory_items?: any[];
  estimated_volume?: number;
  estimated_price_min?: number;
  estimated_price_max?: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
}

export interface UpdateQuoteStatusInput {
  id: string;
  status: "PENDING" | "BOOKED" | "ARCHIVED";
}

export interface CalculateAIQuoteInput {
  rooms: Array<{
    roomName: string;
    roomType?: string;
    items: Array<{
      name: string;
      quantity: number;
      estimatedSize?: string;
      weightLbs?: number;
      volumeCuFt?: number;
    }>;
  }>;
  distance?: string | number;
  classification?: string;
}

// --- Scheduling ---
export interface AssignWorkerToJobInput {
  company_id: string;
  job_id: string;
  worker_id: string;
}

export interface UnassignWorkerFromJobInput {
  company_id: string;
  job_id: string;
  worker_id: string;
}

export interface AssignVehicleToJobInput {
  company_id: string;
  job_id: string;
  vehicle_id: string;
}

export interface UnassignVehicleFromJobInput {
  company_id: string;
  job_id: string;
  vehicle_id: string;
}

export interface AllocateEquipmentToJobInput {
  company_id: string;
  job_id: string;
  equipment_id: string;
  quantity: number;
}

export interface DeallocateEquipmentFromJobInput {
  company_id: string;
  job_id: string;
  equipment_id: string;
}

export interface SetWorkerScheduleInput {
  worker_id: string;
  company_id: string;
  date: string;
  is_available: boolean;
  start_time?: string;
  end_time?: string;
  notes?: string;
}

export interface SetVehicleScheduleInput {
  vehicle_id: string;
  company_id: string;
  schedule_date: string;
  status: number;
  maintenance_type?: number;
}

export interface SetEquipmentScheduleInput {
  equipment_id: string;
  company_id: string;
  schedule_date: string;
  status: number;
  reason?: string;
}

export interface GetScheduleRangeInput {
  resource_id: string;
  company_id: string;
  start_date: string;
  end_date: string;
}

// --- Incidents ---
export interface CreateIncidentInput {
  company_id: string;
  type: "injury" | "damage" | "vehicle_issue" | "other";
  description: string;
  job_id?: string;
  reported_by: string;
}

export interface UpdateIncidentInput {
  id: string;
  status?: "open" | "investigating" | "resolved";
  description?: string;
}

// --- Payroll ---
export interface CreatePayrollRecordInput {
  company_id: string;
  worker_id: string;
  pay_period_start: string;
  pay_period_end: string;
  hourly_wage: number;
  hours_worked: number;
}

export interface UpdatePayrollRecordInput {
  id: string;
  hourly_wage?: number;
  hours_worked?: number;
  status?: PayrollRecordStatus;
}

// --- Invitations ---
export interface CreateInvitationInput {
  company_id: string;
  email: string;
  name?: string;
  phone_number?: string;
  role: "worker" | "manager";
  expires_at?: string;
}

export interface UpdateInvitationStatusInput {
  id: string;
  status: "pending" | "accepted";
}

// --- Company ---
export interface UpdateCompanyInput {
  id: string;
  name?: string;
  license_number?: string;
  contact_email?: string;
  warehouse_locations?: string[];
}

// --- Analytics ---
export interface GetAvailableWorkersInput {
  company_id: string;
  date: string;
}

export interface DateRangeInput {
  company_id: string;
  start_date: string;
  end_date: string;
}

export interface GetUpcomingJobsInput {
  company_id: string;
  days: number;
}

// --- API Keys ---
export interface CreateApiKeyInput {
  company_id: string;
  name: string;
  role: UserRole;
}

export interface RevokeApiKeyInput {
  id: string;
}
