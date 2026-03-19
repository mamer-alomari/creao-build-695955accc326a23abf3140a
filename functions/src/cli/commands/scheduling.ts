import { AuthContext } from "../../actions/_base";
import * as actions from "../../actions";

function print(result: any) {
  console.log(JSON.stringify(result, null, 2));
}

export async function assignWorker(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.assignWorkerToJob(ctx, {
    company_id: flags.company_id || ctx.companyId,
    job_id: flags.job_id,
    worker_id: flags.worker_id,
  }));
}

export async function unassignWorker(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.unassignWorkerFromJob(ctx, {
    company_id: flags.company_id || ctx.companyId,
    job_id: flags.job_id,
    worker_id: flags.worker_id,
  }));
}

export async function assignVehicle(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.assignVehicleToJob(ctx, {
    company_id: flags.company_id || ctx.companyId,
    job_id: flags.job_id,
    vehicle_id: flags.vehicle_id,
  }));
}

export async function unassignVehicle(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.unassignVehicleFromJob(ctx, {
    company_id: flags.company_id || ctx.companyId,
    job_id: flags.job_id,
    vehicle_id: flags.vehicle_id,
  }));
}

export async function allocateEquipment(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.allocateEquipmentToJob(ctx, {
    company_id: flags.company_id || ctx.companyId,
    job_id: flags.job_id,
    equipment_id: flags.equipment_id,
    quantity: Number(flags.quantity),
  }));
}

export async function deallocateEquipment(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.deallocateEquipmentFromJob(ctx, {
    company_id: flags.company_id || ctx.companyId,
    job_id: flags.job_id,
    equipment_id: flags.equipment_id,
  }));
}

export async function workerSchedule(ctx: AuthContext, flags: Record<string, string>) {
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

export async function workerScheduleRange(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.getWorkerScheduleRange(ctx, {
    resource_id: flags.worker_id,
    company_id: flags.company_id || ctx.companyId,
    start_date: flags.start_date,
    end_date: flags.end_date,
  }));
}

export async function vehicleScheduleRange(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.getVehicleScheduleRange(ctx, {
    resource_id: flags.vehicle_id,
    company_id: flags.company_id || ctx.companyId,
    start_date: flags.start_date,
    end_date: flags.end_date,
  }));
}

export async function equipmentScheduleRange(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.getEquipmentScheduleRange(ctx, {
    resource_id: flags.equipment_id,
    company_id: flags.company_id || ctx.companyId,
    start_date: flags.start_date,
    end_date: flags.end_date,
  }));
}
