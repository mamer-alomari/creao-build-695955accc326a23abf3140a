"use strict";
// Pure enum definitions — no runtime imports, shared by client and server
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaintenanceType = exports.EquipmentScheduleStatus = exports.VehicleScheduleMaintenanceType = exports.VehicleScheduleStatus = exports.PayrollRecordStatus = exports.EquipmentType = exports.VehicleType = exports.WorkerStatus = exports.WorkerRole = exports.JobStatus = void 0;
var JobStatus;
(function (JobStatus) {
    JobStatus[JobStatus["Unspecified"] = 0] = "Unspecified";
    JobStatus[JobStatus["Quote"] = 1] = "Quote";
    JobStatus[JobStatus["Booked"] = 2] = "Booked";
    JobStatus[JobStatus["InProgress"] = 3] = "InProgress";
    JobStatus[JobStatus["Completed"] = 4] = "Completed";
    JobStatus[JobStatus["Canceled"] = 5] = "Canceled";
    JobStatus[JobStatus["EnRoute"] = 6] = "EnRoute";
    JobStatus[JobStatus["Arrived"] = 7] = "Arrived";
    JobStatus[JobStatus["Loading"] = 8] = "Loading";
    JobStatus[JobStatus["onWayToDropoff"] = 9] = "onWayToDropoff";
    JobStatus[JobStatus["Unloading"] = 10] = "Unloading";
    JobStatus[JobStatus["ReturningToWarehouse"] = 11] = "ReturningToWarehouse";
})(JobStatus || (exports.JobStatus = JobStatus = {}));
var WorkerRole;
(function (WorkerRole) {
    WorkerRole["Unspecified"] = "unspecified";
    WorkerRole["Customer"] = "customer";
    WorkerRole["Worker"] = "worker";
    WorkerRole["Foreman"] = "foreman";
    WorkerRole["Manager"] = "manager";
    WorkerRole["Admin"] = "admin";
})(WorkerRole || (exports.WorkerRole = WorkerRole = {}));
var WorkerStatus;
(function (WorkerStatus) {
    WorkerStatus[WorkerStatus["Unspecified"] = 0] = "Unspecified";
    WorkerStatus[WorkerStatus["Active"] = 1] = "Active";
    WorkerStatus[WorkerStatus["Inactive"] = 2] = "Inactive";
})(WorkerStatus || (exports.WorkerStatus = WorkerStatus = {}));
var VehicleType;
(function (VehicleType) {
    VehicleType[VehicleType["Unspecified"] = 0] = "Unspecified";
    VehicleType[VehicleType["BoxTruck16ft"] = 1] = "BoxTruck16ft";
    VehicleType[VehicleType["BoxTruck26ft"] = 2] = "BoxTruck26ft";
    VehicleType[VehicleType["CargoVan"] = 3] = "CargoVan";
    VehicleType[VehicleType["Flatbed"] = 4] = "Flatbed";
})(VehicleType || (exports.VehicleType = VehicleType = {}));
var EquipmentType;
(function (EquipmentType) {
    EquipmentType[EquipmentType["Unspecified"] = 0] = "Unspecified";
    EquipmentType[EquipmentType["Reusable"] = 1] = "Reusable";
    EquipmentType[EquipmentType["Consumable"] = 2] = "Consumable";
})(EquipmentType || (exports.EquipmentType = EquipmentType = {}));
var PayrollRecordStatus;
(function (PayrollRecordStatus) {
    PayrollRecordStatus[PayrollRecordStatus["Unspecified"] = 0] = "Unspecified";
    PayrollRecordStatus[PayrollRecordStatus["Draft"] = 1] = "Draft";
    PayrollRecordStatus[PayrollRecordStatus["Approved"] = 2] = "Approved";
    PayrollRecordStatus[PayrollRecordStatus["Paid"] = 3] = "Paid";
})(PayrollRecordStatus || (exports.PayrollRecordStatus = PayrollRecordStatus = {}));
var VehicleScheduleStatus;
(function (VehicleScheduleStatus) {
    VehicleScheduleStatus[VehicleScheduleStatus["Unspecified"] = 0] = "Unspecified";
    VehicleScheduleStatus[VehicleScheduleStatus["Available"] = 1] = "Available";
    VehicleScheduleStatus[VehicleScheduleStatus["InUse"] = 2] = "InUse";
    VehicleScheduleStatus[VehicleScheduleStatus["Maintenance"] = 3] = "Maintenance";
})(VehicleScheduleStatus || (exports.VehicleScheduleStatus = VehicleScheduleStatus = {}));
var VehicleScheduleMaintenanceType;
(function (VehicleScheduleMaintenanceType) {
    VehicleScheduleMaintenanceType[VehicleScheduleMaintenanceType["Unspecified"] = 0] = "Unspecified";
    VehicleScheduleMaintenanceType[VehicleScheduleMaintenanceType["Preventive"] = 1] = "Preventive";
    VehicleScheduleMaintenanceType[VehicleScheduleMaintenanceType["Repair"] = 2] = "Repair";
    VehicleScheduleMaintenanceType[VehicleScheduleMaintenanceType["Inspection"] = 3] = "Inspection";
})(VehicleScheduleMaintenanceType || (exports.VehicleScheduleMaintenanceType = VehicleScheduleMaintenanceType = {}));
var EquipmentScheduleStatus;
(function (EquipmentScheduleStatus) {
    EquipmentScheduleStatus[EquipmentScheduleStatus["Unspecified"] = 0] = "Unspecified";
    EquipmentScheduleStatus[EquipmentScheduleStatus["Available"] = 1] = "Available";
    EquipmentScheduleStatus[EquipmentScheduleStatus["Reserved"] = 2] = "Reserved";
    EquipmentScheduleStatus[EquipmentScheduleStatus["InMaintenance"] = 3] = "InMaintenance";
})(EquipmentScheduleStatus || (exports.EquipmentScheduleStatus = EquipmentScheduleStatus = {}));
var MaintenanceType;
(function (MaintenanceType) {
    MaintenanceType[MaintenanceType["Unspecified"] = 0] = "Unspecified";
    MaintenanceType[MaintenanceType["Routine"] = 1] = "Routine";
    MaintenanceType[MaintenanceType["Repair"] = 2] = "Repair";
    MaintenanceType[MaintenanceType["Inspection"] = 3] = "Inspection";
    MaintenanceType[MaintenanceType["Upgrade"] = 4] = "Upgrade";
})(MaintenanceType || (exports.MaintenanceType = MaintenanceType = {}));
//# sourceMappingURL=enums.js.map