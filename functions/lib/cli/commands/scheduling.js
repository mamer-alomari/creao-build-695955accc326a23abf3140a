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
exports.assignWorker = assignWorker;
exports.unassignWorker = unassignWorker;
exports.assignVehicle = assignVehicle;
exports.unassignVehicle = unassignVehicle;
exports.allocateEquipment = allocateEquipment;
exports.deallocateEquipment = deallocateEquipment;
exports.workerSchedule = workerSchedule;
exports.workerScheduleRange = workerScheduleRange;
exports.vehicleScheduleRange = vehicleScheduleRange;
exports.equipmentScheduleRange = equipmentScheduleRange;
const actions = __importStar(require("../../actions"));
function print(result) {
    console.log(JSON.stringify(result, null, 2));
}
async function assignWorker(ctx, flags) {
    print(await actions.assignWorkerToJob(ctx, {
        company_id: flags.company_id || ctx.companyId,
        job_id: flags.job_id,
        worker_id: flags.worker_id,
    }));
}
async function unassignWorker(ctx, flags) {
    print(await actions.unassignWorkerFromJob(ctx, {
        company_id: flags.company_id || ctx.companyId,
        job_id: flags.job_id,
        worker_id: flags.worker_id,
    }));
}
async function assignVehicle(ctx, flags) {
    print(await actions.assignVehicleToJob(ctx, {
        company_id: flags.company_id || ctx.companyId,
        job_id: flags.job_id,
        vehicle_id: flags.vehicle_id,
    }));
}
async function unassignVehicle(ctx, flags) {
    print(await actions.unassignVehicleFromJob(ctx, {
        company_id: flags.company_id || ctx.companyId,
        job_id: flags.job_id,
        vehicle_id: flags.vehicle_id,
    }));
}
async function allocateEquipment(ctx, flags) {
    print(await actions.allocateEquipmentToJob(ctx, {
        company_id: flags.company_id || ctx.companyId,
        job_id: flags.job_id,
        equipment_id: flags.equipment_id,
        quantity: Number(flags.quantity),
    }));
}
async function deallocateEquipment(ctx, flags) {
    print(await actions.deallocateEquipmentFromJob(ctx, {
        company_id: flags.company_id || ctx.companyId,
        job_id: flags.job_id,
        equipment_id: flags.equipment_id,
    }));
}
async function workerSchedule(ctx, flags) {
    print(await actions.setWorkerSchedule(ctx, {
        worker_id: flags.worker_id,
        company_id: flags.company_id || ctx.companyId,
        date: flags.date,
        is_available: flags.available !== "false",
        start_time: flags.start_time,
        end_time: flags.end_time,
        notes: flags.notes,
    }));
}
async function workerScheduleRange(ctx, flags) {
    print(await actions.getWorkerScheduleRange(ctx, {
        resource_id: flags.worker_id,
        company_id: flags.company_id || ctx.companyId,
        start_date: flags.start_date,
        end_date: flags.end_date,
    }));
}
async function vehicleScheduleRange(ctx, flags) {
    print(await actions.getVehicleScheduleRange(ctx, {
        resource_id: flags.vehicle_id,
        company_id: flags.company_id || ctx.companyId,
        start_date: flags.start_date,
        end_date: flags.end_date,
    }));
}
async function equipmentScheduleRange(ctx, flags) {
    print(await actions.getEquipmentScheduleRange(ctx, {
        resource_id: flags.equipment_id,
        company_id: flags.company_id || ctx.companyId,
        start_date: flags.start_date,
        end_date: flags.end_date,
    }));
}
//# sourceMappingURL=scheduling.js.map