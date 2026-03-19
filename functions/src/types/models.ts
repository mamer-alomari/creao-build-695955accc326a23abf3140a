// Pure model interfaces — no runtime imports, shared by client and server

import {
  JobStatus,
  JobStopType,
  JobStopStatus,
  WorkerRole,
  UserRole,
  WorkerStatus,
  VehicleType,
  EquipmentType,
  PayrollRecordStatus,
  VehicleScheduleStatus,
  VehicleScheduleMaintenanceType,
  EquipmentScheduleStatus,
  MaintenanceType,
} from "./enums";

export interface JobStop {
  id: string;
  address: string;
  type: JobStopType;
  sequence: number;
  status: JobStopStatus;
  actual_arrival_time?: string;
  actual_departure_time?: string;
  inventory_loaded?: string;
  inventory_unloaded?: string;
  photos?: string[];
  signatures?: {
    customer_sign?: string;
    foreman_sign?: string;
    timestamp?: string;
  };
  notes?: string;
}

export interface JobModel {
  id: string;
  data_creator: string;
  data_updater: string;
  create_time: string;
  update_time: string;
  company_id: string;
  customer_name: string;
  status: JobStatus;
  scheduled_date: string;
  pickup_address: string;
  dropoff_address: string;
  estimated_cost?: number | null;
  full_price?: number | null;
  distance?: string;
  classification?: "intrastate" | "interstate";
  inventory_data?: string;
  customer_id?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  vehicle_id?: string;
  equipment_ids?: string[];
  vehicle_checklist?: {
    engine_start: boolean;
    no_check_engine_light: boolean;
    warmed_up: boolean;
    equipment_present: boolean;
    timestamp: string;
    completed_by: string;
  };
  final_inventory_data?: string;
  ai_quote_amount?: number;
  final_quote_amount?: number;
  quote_approval_status?: "pending" | "approved" | "rejected";
  signatures?: {
    customer_sign: string;
    foreman_sign: string;
    timestamp: string;
  };
  payment_status?: "pending" | "deposit_paid" | "fully_paid";
  deposit_amount?: number;
  loading_photos?: string[];
  closing_notes?: string;
  stops?: JobStop[];
  current_stop_index?: number;
}

export interface WorkerModel {
  id: string;
  data_creator: string;
  data_updater: string;
  create_time: string;
  update_time: string;
  full_name: string;
  role: WorkerRole;
  status: WorkerStatus;
  company_id: string;
  hourly_rate?: number;
  email?: string;
  phone_number?: string;
  can_self_schedule?: boolean;
}

export interface VehicleModel {
  id: string;
  data_creator: string;
  data_updater: string;
  create_time: string;
  update_time: string;
  company_id: string;
  vehicle_name: string;
  license_plate: string;
  type: VehicleType;
  capacity_cft?: number | null;
}

export interface EquipmentModel {
  id: string;
  data_creator: string;
  data_updater: string;
  create_time: string;
  update_time: string;
  company_id: string;
  name: string;
  total_quantity: number;
  type: EquipmentType;
  description?: string | null;
}

export interface CompanyModel {
  id: string;
  data_creator: string;
  data_updater: string;
  create_time: string;
  update_time: string;
  name: string;
  license_number?: string | null;
  contact_email: string;
  warehouse_locations?: string[];
  stripe_account_id?: string;
  stripe_onboarding_complete?: boolean;
}

export interface QuoteModel {
  id: string;
  create_time: string;
  update_time: string;
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
  status: "PENDING" | "BOOKED" | "ARCHIVED";
  company_id: string;
  customer_id?: string;
  stops?: Array<{ address: string; type: "pickup" | "dropoff" | "storage" }>;
  expires_at?: string;
  quote_breakdown?: {
    laborCost: number;
    fuelCost: number;
    materialsCost: number;
    insuranceCost: number;
    totalEstimate: number;
    details: {
      estimatedHours: number;
      distanceMiles: number;
      itemCount: number;
      totalVolumeCuFt: number;
      totalWeightLbs: number;
    };
  };
}

export interface IncidentModel {
  id: string;
  create_time: string;
  type: "injury" | "damage" | "vehicle_issue" | "other";
  description: string;
  job_id?: string;
  reported_by: string;
  company_id: string;
  status: "open" | "investigating" | "resolved";
  photos?: string[];
  media_urls?: string[];
}

export interface PayrollRecordModel {
  id: string;
  data_creator: string;
  data_updater: string;
  create_time: string;
  update_time: string;
  worker_id: string;
  company_id: string;
  pay_period_start: string;
  pay_period_end: string;
  hourly_wage: number;
  hours_worked: number;
  total_pay: number;
  status: PayrollRecordStatus;
}

export interface JobWorkerAssignmentModel {
  id: string;
  data_creator: string;
  data_updater: string;
  create_time: string;
  update_time: string;
  company_id: string;
  job_id: string;
  worker_id: string;
}

export interface JobVehicleAssignmentModel {
  id: string;
  data_creator: string;
  data_updater: string;
  create_time: string;
  update_time: string;
  company_id: string;
  job_id: string;
  vehicle_id: string;
}

export interface JobEquipmentAllocationModel {
  id: string;
  data_creator: string;
  data_updater: string;
  create_time: string;
  update_time: string;
  company_id: string;
  job_id: string;
  equipment_id: string;
  quantity_assigned: number;
}

export interface WorkerScheduleModel {
  id: string;
  worker_id: string;
  company_id: string;
  date: string;
  is_available: boolean;
  start_time?: string;
  end_time?: string;
  notes?: string;
  create_time: string;
  update_time: string;
}

export interface VehicleScheduleModel {
  id: string;
  data_creator: string;
  data_updater: string;
  create_time: string;
  update_time: string;
  vehicle_id: string;
  company_id: string;
  schedule_date: string;
  status: VehicleScheduleStatus;
  maintenance_type?: VehicleScheduleMaintenanceType | null;
}

export interface EquipmentScheduleModel {
  id: string;
  data_creator: string;
  data_updater: string;
  create_time: string;
  update_time: string;
  equipment_id: string;
  company_id: string;
  schedule_date: string;
  status: EquipmentScheduleStatus;
  reason?: string | null;
}

export interface StorageFacilityModel {
  id: string;
  create_time: string;
  update_time: string;
  data_creator: string;
  data_updater: string;
  company_id: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  google_place_id?: string;
  notes?: string;
  location?: { lat: number; lng: number };
}

export interface InvitationModel {
  id: string;
  email: string;
  name?: string;
  phone_number?: string;
  role: "worker" | "manager";
  company_id: string;
  status: "pending" | "accepted";
  create_time: string;
  expires_at: string;
  created_by: string;
}

export interface MaintenanceRecordModel {
  id: string;
  data_creator: string;
  data_updater: string;
  create_time: string;
  update_time: string;
  company_id: string;
  vehicle_id: string;
  service_date: string;
  description: string;
  cost: number;
  performed_by: string;
  odometer_reading?: number | null;
  type: MaintenanceType;
  notes?: string | null;
}

export interface WorkerLocationModel {
  id: string;
  worker_name: string;
  company_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  status: "active" | "inactive";
}
