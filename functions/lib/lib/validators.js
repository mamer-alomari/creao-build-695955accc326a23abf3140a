"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetUpcomingJobsSchema = exports.DateRangeSchema = exports.GetAvailableWorkersSchema = exports.UpdateCompanySchema = exports.UpdateInvitationStatusSchema = exports.CreateInvitationSchema = exports.UpdatePayrollRecordSchema = exports.CreatePayrollRecordSchema = exports.UpdateIncidentSchema = exports.CreateIncidentSchema = exports.GetScheduleRangeSchema = exports.SetEquipmentScheduleSchema = exports.SetVehicleScheduleSchema = exports.SetWorkerScheduleSchema = exports.DeallocateEquipmentFromJobSchema = exports.AllocateEquipmentToJobSchema = exports.UnassignVehicleFromJobSchema = exports.AssignVehicleToJobSchema = exports.UnassignWorkerFromJobSchema = exports.AssignWorkerToJobSchema = exports.CalculateAIQuoteSchema = exports.UpdateQuoteStatusSchema = exports.UpdateQuoteSchema = exports.CreateQuoteSchema = exports.UpdateEquipmentSchema = exports.CreateEquipmentSchema = exports.UpdateVehicleSchema = exports.CreateVehicleSchema = exports.UpdateWorkerSchema = exports.CreateWorkerSchema = exports.GetJobsByCustomerSchema = exports.GetJobsByDateRangeSchema = exports.GetJobsByStatusSchema = exports.DeleteByIdSchema = exports.GetByIdSchema = exports.ListByCompanySchema = exports.UpdateJobStatusSchema = exports.UpdateJobSchema = exports.CreateJobSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../types/enums");
// --- Jobs ---
exports.CreateJobSchema = zod_1.z.object({
    company_id: zod_1.z.string().min(1),
    customer_name: zod_1.z.string().min(1),
    scheduled_date: zod_1.z.string().min(1),
    pickup_address: zod_1.z.string().min(1),
    dropoff_address: zod_1.z.string().min(1),
    estimated_cost: zod_1.z.number().optional(),
    distance: zod_1.z.string().optional(),
    customer_id: zod_1.z.string().optional(),
    inventory_data: zod_1.z.string().optional(),
    stops: zod_1.z.array(zod_1.z.object({
        address: zod_1.z.string(),
        type: zod_1.z.enum(["pickup", "dropoff", "storage"]),
        sequence: zod_1.z.number(),
        actual_arrival_time: zod_1.z.string().optional(),
        actual_departure_time: zod_1.z.string().optional(),
        inventory_loaded: zod_1.z.string().optional(),
        inventory_unloaded: zod_1.z.string().optional(),
        photos: zod_1.z.array(zod_1.z.string()).optional(),
        signatures: zod_1.z.object({
            customer_sign: zod_1.z.string().optional(),
            foreman_sign: zod_1.z.string().optional(),
            timestamp: zod_1.z.string().optional(),
        }).optional(),
        notes: zod_1.z.string().optional(),
    })).optional(),
});
exports.UpdateJobSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    customer_name: zod_1.z.string().optional(),
    scheduled_date: zod_1.z.string().optional(),
    pickup_address: zod_1.z.string().optional(),
    dropoff_address: zod_1.z.string().optional(),
    estimated_cost: zod_1.z.number().optional(),
    distance: zod_1.z.string().optional(),
    inventory_data: zod_1.z.string().optional(),
    closing_notes: zod_1.z.string().optional(),
    final_quote_amount: zod_1.z.number().optional(),
    payment_status: zod_1.z.enum(["pending", "deposit_paid", "fully_paid"]).optional(),
    deposit_amount: zod_1.z.number().optional(),
});
exports.UpdateJobStatusSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    status: zod_1.z.nativeEnum(enums_1.JobStatus),
});
exports.ListByCompanySchema = zod_1.z.object({
    company_id: zod_1.z.string().min(1),
});
exports.GetByIdSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
});
exports.DeleteByIdSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
});
exports.GetJobsByStatusSchema = zod_1.z.object({
    company_id: zod_1.z.string().min(1),
    status: zod_1.z.nativeEnum(enums_1.JobStatus),
});
exports.GetJobsByDateRangeSchema = zod_1.z.object({
    company_id: zod_1.z.string().min(1),
    start_date: zod_1.z.string().min(1),
    end_date: zod_1.z.string().min(1),
});
exports.GetJobsByCustomerSchema = zod_1.z.object({
    company_id: zod_1.z.string().min(1),
    customer_name: zod_1.z.string().min(1),
});
// --- Workers ---
exports.CreateWorkerSchema = zod_1.z.object({
    company_id: zod_1.z.string().min(1),
    full_name: zod_1.z.string().min(1),
    role: zod_1.z.nativeEnum(enums_1.WorkerRole),
    status: zod_1.z.nativeEnum(enums_1.WorkerStatus).optional(),
    hourly_rate: zod_1.z.number().optional(),
    email: zod_1.z.string().email().optional(),
    phone_number: zod_1.z.string().optional(),
    can_self_schedule: zod_1.z.boolean().optional(),
});
exports.UpdateWorkerSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    full_name: zod_1.z.string().optional(),
    role: zod_1.z.nativeEnum(enums_1.WorkerRole).optional(),
    status: zod_1.z.nativeEnum(enums_1.WorkerStatus).optional(),
    hourly_rate: zod_1.z.number().optional(),
    email: zod_1.z.string().email().optional(),
    phone_number: zod_1.z.string().optional(),
    can_self_schedule: zod_1.z.boolean().optional(),
});
// --- Vehicles ---
exports.CreateVehicleSchema = zod_1.z.object({
    company_id: zod_1.z.string().min(1),
    vehicle_name: zod_1.z.string().min(1),
    license_plate: zod_1.z.string().min(1),
    type: zod_1.z.nativeEnum(enums_1.VehicleType),
    capacity_cft: zod_1.z.number().optional(),
});
exports.UpdateVehicleSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    vehicle_name: zod_1.z.string().optional(),
    license_plate: zod_1.z.string().optional(),
    type: zod_1.z.nativeEnum(enums_1.VehicleType).optional(),
    capacity_cft: zod_1.z.number().optional(),
});
// --- Equipment ---
exports.CreateEquipmentSchema = zod_1.z.object({
    company_id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    total_quantity: zod_1.z.number().int().min(0),
    type: zod_1.z.nativeEnum(enums_1.EquipmentType),
    description: zod_1.z.string().optional(),
});
exports.UpdateEquipmentSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().optional(),
    total_quantity: zod_1.z.number().int().min(0).optional(),
    type: zod_1.z.nativeEnum(enums_1.EquipmentType).optional(),
    description: zod_1.z.string().optional(),
});
// --- Quotes ---
exports.CreateQuoteSchema = zod_1.z.object({
    company_id: zod_1.z.string().min(1),
    pickup_address: zod_1.z.string().min(1),
    dropoff_address: zod_1.z.string().min(1),
    move_date: zod_1.z.string().min(1),
    inventory_items: zod_1.z.array(zod_1.z.any()),
    estimated_volume: zod_1.z.number(),
    estimated_price_min: zod_1.z.number(),
    estimated_price_max: zod_1.z.number(),
    customer_name: zod_1.z.string().min(1),
    customer_email: zod_1.z.string().email(),
    customer_phone: zod_1.z.string().min(1),
    customer_id: zod_1.z.string().optional(),
    stops: zod_1.z.array(zod_1.z.object({
        address: zod_1.z.string(),
        type: zod_1.z.enum(["pickup", "dropoff", "storage"]),
    })).optional(),
    expires_at: zod_1.z.string().optional(),
});
exports.UpdateQuoteSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    pickup_address: zod_1.z.string().optional(),
    dropoff_address: zod_1.z.string().optional(),
    move_date: zod_1.z.string().optional(),
    inventory_items: zod_1.z.array(zod_1.z.any()).optional(),
    estimated_volume: zod_1.z.number().optional(),
    estimated_price_min: zod_1.z.number().optional(),
    estimated_price_max: zod_1.z.number().optional(),
    customer_name: zod_1.z.string().optional(),
    customer_email: zod_1.z.string().email().optional(),
    customer_phone: zod_1.z.string().optional(),
});
exports.UpdateQuoteStatusSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    status: zod_1.z.enum(["PENDING", "BOOKED", "ARCHIVED"]),
});
exports.CalculateAIQuoteSchema = zod_1.z.object({
    rooms: zod_1.z.array(zod_1.z.object({
        roomName: zod_1.z.string(),
        roomType: zod_1.z.string().optional(),
        items: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            quantity: zod_1.z.number(),
            estimatedSize: zod_1.z.string().optional(),
            weightLbs: zod_1.z.number().optional(),
            volumeCuFt: zod_1.z.number().optional(),
        })),
    })),
    distance: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
    classification: zod_1.z.string().optional(),
});
// --- Scheduling ---
exports.AssignWorkerToJobSchema = zod_1.z.object({
    company_id: zod_1.z.string().min(1),
    job_id: zod_1.z.string().min(1),
    worker_id: zod_1.z.string().min(1),
});
exports.UnassignWorkerFromJobSchema = zod_1.z.object({
    company_id: zod_1.z.string().min(1),
    job_id: zod_1.z.string().min(1),
    worker_id: zod_1.z.string().min(1),
});
exports.AssignVehicleToJobSchema = zod_1.z.object({
    company_id: zod_1.z.string().min(1),
    job_id: zod_1.z.string().min(1),
    vehicle_id: zod_1.z.string().min(1),
});
exports.UnassignVehicleFromJobSchema = zod_1.z.object({
    company_id: zod_1.z.string().min(1),
    job_id: zod_1.z.string().min(1),
    vehicle_id: zod_1.z.string().min(1),
});
exports.AllocateEquipmentToJobSchema = zod_1.z.object({
    company_id: zod_1.z.string().min(1),
    job_id: zod_1.z.string().min(1),
    equipment_id: zod_1.z.string().min(1),
    quantity: zod_1.z.number().int().min(1),
});
exports.DeallocateEquipmentFromJobSchema = zod_1.z.object({
    company_id: zod_1.z.string().min(1),
    job_id: zod_1.z.string().min(1),
    equipment_id: zod_1.z.string().min(1),
});
exports.SetWorkerScheduleSchema = zod_1.z.object({
    worker_id: zod_1.z.string().min(1),
    company_id: zod_1.z.string().min(1),
    date: zod_1.z.string().min(1),
    is_available: zod_1.z.boolean(),
    start_time: zod_1.z.string().optional(),
    end_time: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
exports.SetVehicleScheduleSchema = zod_1.z.object({
    vehicle_id: zod_1.z.string().min(1),
    company_id: zod_1.z.string().min(1),
    schedule_date: zod_1.z.string().min(1),
    status: zod_1.z.nativeEnum(enums_1.VehicleScheduleStatus),
    maintenance_type: zod_1.z.nativeEnum(enums_1.VehicleScheduleMaintenanceType).optional(),
});
exports.SetEquipmentScheduleSchema = zod_1.z.object({
    equipment_id: zod_1.z.string().min(1),
    company_id: zod_1.z.string().min(1),
    schedule_date: zod_1.z.string().min(1),
    status: zod_1.z.nativeEnum(enums_1.EquipmentScheduleStatus),
    reason: zod_1.z.string().optional(),
});
exports.GetScheduleRangeSchema = zod_1.z.object({
    resource_id: zod_1.z.string().min(1),
    company_id: zod_1.z.string().min(1),
    start_date: zod_1.z.string().min(1),
    end_date: zod_1.z.string().min(1),
});
// --- Incidents ---
exports.CreateIncidentSchema = zod_1.z.object({
    company_id: zod_1.z.string().min(1),
    type: zod_1.z.enum(["injury", "damage", "vehicle_issue", "other"]),
    description: zod_1.z.string().min(1),
    job_id: zod_1.z.string().optional(),
    reported_by: zod_1.z.string().min(1),
});
exports.UpdateIncidentSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    status: zod_1.z.enum(["open", "investigating", "resolved"]).optional(),
    description: zod_1.z.string().optional(),
});
// --- Payroll ---
exports.CreatePayrollRecordSchema = zod_1.z.object({
    company_id: zod_1.z.string().min(1),
    worker_id: zod_1.z.string().min(1),
    pay_period_start: zod_1.z.string().min(1),
    pay_period_end: zod_1.z.string().min(1),
    hourly_wage: zod_1.z.number().min(0),
    hours_worked: zod_1.z.number().min(0),
});
exports.UpdatePayrollRecordSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    hourly_wage: zod_1.z.number().min(0).optional(),
    hours_worked: zod_1.z.number().min(0).optional(),
    status: zod_1.z.nativeEnum(enums_1.PayrollRecordStatus).optional(),
});
// --- Invitations ---
exports.CreateInvitationSchema = zod_1.z.object({
    company_id: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    name: zod_1.z.string().optional(),
    phone_number: zod_1.z.string().optional(),
    role: zod_1.z.enum(["worker", "manager"]),
    expires_at: zod_1.z.string().optional(),
});
exports.UpdateInvitationStatusSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    status: zod_1.z.enum(["pending", "accepted"]),
});
// --- Company ---
exports.UpdateCompanySchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().optional(),
    license_number: zod_1.z.string().optional(),
    contact_email: zod_1.z.string().email().optional(),
    warehouse_locations: zod_1.z.array(zod_1.z.string()).optional(),
});
// --- Analytics ---
exports.GetAvailableWorkersSchema = zod_1.z.object({
    company_id: zod_1.z.string().min(1),
    date: zod_1.z.string().min(1),
});
exports.DateRangeSchema = zod_1.z.object({
    company_id: zod_1.z.string().min(1),
    start_date: zod_1.z.string().min(1),
    end_date: zod_1.z.string().min(1),
});
exports.GetUpcomingJobsSchema = zod_1.z.object({
    company_id: zod_1.z.string().min(1),
    days: zod_1.z.number().int().min(1).max(90),
});
//# sourceMappingURL=validators.js.map