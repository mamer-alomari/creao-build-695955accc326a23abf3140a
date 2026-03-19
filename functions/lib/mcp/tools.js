"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolDefinitions = void 0;
const actions = __importStar(require("../actions"));
exports.toolDefinitions = [
    // Jobs
    { name: "jobs/create_job", description: "Create a new moving job", action: actions.createJob, schema: "CreateJobSchema" },
    { name: "jobs/get_job", description: "Get a job by ID", action: actions.getJob, schema: "GetByIdSchema" },
    { name: "jobs/update_job", description: "Update an existing job", action: actions.updateJob, schema: "UpdateJobSchema" },
    { name: "jobs/delete_job", description: "Delete a job", action: actions.deleteJob, schema: "DeleteByIdSchema" },
    { name: "jobs/list_jobs", description: "List all jobs for a company", action: actions.listJobsByCompany, schema: "ListByCompanySchema" },
    { name: "jobs/get_jobs_by_status", description: "Get jobs filtered by status", action: actions.getJobsByStatus, schema: "GetJobsByStatusSchema" },
    { name: "jobs/get_jobs_by_date_range", description: "Get jobs in a date range", action: actions.getJobsByDateRange, schema: "GetJobsByDateRangeSchema" },
    { name: "jobs/update_job_status", description: "Update a job's status", action: actions.updateJobStatus, schema: "UpdateJobStatusSchema" },
    { name: "jobs/get_jobs_by_customer", description: "Get jobs for a specific customer", action: actions.getJobsByCustomer, schema: "GetJobsByCustomerSchema" },
    // Workers
    { name: "workers/create_worker", description: "Create a new worker", action: actions.createWorker, schema: "CreateWorkerSchema" },
    { name: "workers/get_worker", description: "Get a worker by ID", action: actions.getWorker, schema: "GetByIdSchema" },
    { name: "workers/update_worker", description: "Update a worker", action: actions.updateWorker, schema: "UpdateWorkerSchema" },
    { name: "workers/delete_worker", description: "Delete a worker", action: actions.deleteWorker, schema: "DeleteByIdSchema" },
    { name: "workers/list_workers", description: "List all workers for a company", action: actions.listWorkersByCompany, schema: "ListByCompanySchema" },
    // Vehicles
    { name: "vehicles/create_vehicle", description: "Create a new vehicle", action: actions.createVehicle, schema: "CreateVehicleSchema" },
    { name: "vehicles/get_vehicle", description: "Get a vehicle by ID", action: actions.getVehicle, schema: "GetByIdSchema" },
    { name: "vehicles/update_vehicle", description: "Update a vehicle", action: actions.updateVehicle, schema: "UpdateVehicleSchema" },
    { name: "vehicles/delete_vehicle", description: "Delete a vehicle", action: actions.deleteVehicle, schema: "DeleteByIdSchema" },
    { name: "vehicles/list_vehicles", description: "List all vehicles for a company", action: actions.listVehiclesByCompany, schema: "ListByCompanySchema" },
    // Equipment
    { name: "equipment/create_equipment", description: "Create new equipment", action: actions.createEquipment, schema: "CreateEquipmentSchema" },
    { name: "equipment/get_equipment", description: "Get equipment by ID", action: actions.getEquipment, schema: "GetByIdSchema" },
    { name: "equipment/update_equipment", description: "Update equipment", action: actions.updateEquipment, schema: "UpdateEquipmentSchema" },
    { name: "equipment/delete_equipment", description: "Delete equipment", action: actions.deleteEquipment, schema: "DeleteByIdSchema" },
    { name: "equipment/list_equipment", description: "List all equipment for a company", action: actions.listEquipmentByCompany, schema: "ListByCompanySchema" },
    // Quotes
    { name: "quotes/create_quote", description: "Create a new quote", action: actions.createQuote, schema: "CreateQuoteSchema" },
    { name: "quotes/get_quote", description: "Get a quote by ID", action: actions.getQuote, schema: "GetByIdSchema" },
    { name: "quotes/update_quote", description: "Update a quote", action: actions.updateQuote, schema: "UpdateQuoteSchema" },
    { name: "quotes/list_quotes", description: "List all quotes for a company", action: actions.listQuotesByCompany, schema: "ListByCompanySchema" },
    { name: "quotes/update_quote_status", description: "Update a quote's status", action: actions.updateQuoteStatus, schema: "UpdateQuoteStatusSchema" },
    { name: "quotes/calculate_ai_quote", description: "Calculate an AI-powered moving quote based on inventory and distance", action: actions.calculateAIQuoteAction, schema: "CalculateAIQuoteSchema" },
    // Scheduling
    { name: "scheduling/assign_worker_to_job", description: "Assign a worker to a job", action: actions.assignWorkerToJob, schema: "AssignWorkerToJobSchema" },
    { name: "scheduling/unassign_worker_from_job", description: "Remove a worker from a job", action: actions.unassignWorkerFromJob, schema: "UnassignWorkerFromJobSchema" },
    { name: "scheduling/assign_vehicle_to_job", description: "Assign a vehicle to a job", action: actions.assignVehicleToJob, schema: "AssignVehicleToJobSchema" },
    { name: "scheduling/unassign_vehicle_from_job", description: "Remove a vehicle from a job", action: actions.unassignVehicleFromJob, schema: "UnassignVehicleFromJobSchema" },
    { name: "scheduling/allocate_equipment_to_job", description: "Allocate equipment to a job (with quantity check)", action: actions.allocateEquipmentToJob, schema: "AllocateEquipmentToJobSchema" },
    { name: "scheduling/deallocate_equipment_from_job", description: "Remove equipment allocation from a job", action: actions.deallocateEquipmentFromJob, schema: "DeallocateEquipmentFromJobSchema" },
    { name: "scheduling/set_worker_schedule", description: "Set a worker's availability for a date", action: actions.setWorkerSchedule, schema: "SetWorkerScheduleSchema" },
    { name: "scheduling/set_vehicle_schedule", description: "Set a vehicle's schedule for a date", action: actions.setVehicleSchedule, schema: "SetVehicleScheduleSchema" },
    { name: "scheduling/set_equipment_schedule", description: "Set equipment schedule for a date", action: actions.setEquipmentSchedule, schema: "SetEquipmentScheduleSchema" },
    { name: "scheduling/get_worker_schedule_range", description: "Get a worker's schedule for a date range", action: actions.getWorkerScheduleRange, schema: "GetScheduleRangeSchema" },
    { name: "scheduling/get_vehicle_schedule_range", description: "Get a vehicle's schedule for a date range", action: actions.getVehicleScheduleRange, schema: "GetScheduleRangeSchema" },
    { name: "scheduling/get_equipment_schedule_range", description: "Get equipment schedule for a date range", action: actions.getEquipmentScheduleRange, schema: "GetScheduleRangeSchema" },
    // Incidents
    { name: "incidents/create_incident", description: "Report a new incident", action: actions.createIncident, schema: "CreateIncidentSchema" },
    { name: "incidents/get_incident", description: "Get an incident by ID", action: actions.getIncident, schema: "GetByIdSchema" },
    { name: "incidents/update_incident", description: "Update an incident", action: actions.updateIncident, schema: "UpdateIncidentSchema" },
    { name: "incidents/list_incidents", description: "List all incidents for a company", action: actions.listIncidentsByCompany, schema: "ListByCompanySchema" },
    // Payroll
    { name: "payroll/create_payroll_record", description: "Create a payroll record", action: actions.createPayrollRecord, schema: "CreatePayrollRecordSchema" },
    { name: "payroll/get_payroll_record", description: "Get a payroll record by ID", action: actions.getPayrollRecord, schema: "GetByIdSchema" },
    { name: "payroll/update_payroll_record", description: "Update a payroll record", action: actions.updatePayrollRecord, schema: "UpdatePayrollRecordSchema" },
    { name: "payroll/delete_payroll_record", description: "Delete a payroll record", action: actions.deletePayrollRecord, schema: "DeleteByIdSchema" },
    { name: "payroll/list_payroll", description: "List payroll records for a company", action: actions.listPayrollByCompany, schema: "ListByCompanySchema" },
    // Invitations
    { name: "invitations/create_invitation", description: "Create a worker invitation", action: actions.createInvitation, schema: "CreateInvitationSchema" },
    { name: "invitations/update_invitation_status", description: "Update invitation status", action: actions.updateInvitationStatus, schema: "UpdateInvitationStatusSchema" },
    { name: "invitations/list_invitations", description: "List invitations for a company", action: actions.listInvitationsByCompany, schema: "ListByCompanySchema" },
    // Company
    { name: "company/get_company", description: "Get company details", action: actions.getCompany, schema: "GetByIdSchema" },
    { name: "company/update_company", description: "Update company details", action: actions.updateCompany, schema: "UpdateCompanySchema" },
    // Analytics
    { name: "analytics/available_workers", description: "Get available workers for a specific date", action: actions.getAvailableWorkersForDate, schema: "GetAvailableWorkersSchema" },
    { name: "analytics/jobs_by_status_this_week", description: "Get job counts grouped by status for the current week", action: actions.getJobsByStatusThisWeek, schema: "ListByCompanySchema" },
    { name: "analytics/revenue_by_month", description: "Get monthly revenue from completed jobs", action: actions.getRevenueByMonth, schema: "DateRangeSchema" },
    { name: "analytics/dashboard_stats", description: "Get composite company dashboard statistics", action: actions.getCompanyDashboardStats, schema: "ListByCompanySchema" },
    { name: "analytics/worker_utilization", description: "Get worker utilization (assignments) in a date range", action: actions.getWorkerUtilization, schema: "DateRangeSchema" },
    { name: "analytics/upcoming_jobs", description: "Get upcoming jobs for the next N days", action: actions.getUpcomingJobs, schema: "GetUpcomingJobsSchema" },
];
//# sourceMappingURL=tools.js.map