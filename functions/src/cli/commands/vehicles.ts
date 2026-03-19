import { AuthContext } from "../../actions/_base";
import * as actions from "../../actions";

function print(result: any) {
  console.log(JSON.stringify(result, null, 2));
}

export async function list(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.listVehiclesByCompany(ctx, { company_id: flags.company_id || ctx.companyId }));
}

export async function get(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.getVehicle(ctx, { id: flags.id }));
}

export async function create(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.createVehicle(ctx, {
    company_id: flags.company_id || ctx.companyId,
    vehicle_name: flags.vehicle_name,
    license_plate: flags.license_plate,
    type: Number(flags.type) || 0,
    capacity_cft: flags.capacity_cft ? Number(flags.capacity_cft) : undefined,
  }));
}

export async function update(ctx: AuthContext, flags: Record<string, string>) {
  const { id, ...rest } = flags;
  const input: any = { id };
  if (rest.vehicle_name) input.vehicle_name = rest.vehicle_name;
  if (rest.license_plate) input.license_plate = rest.license_plate;
  if (rest.type) input.type = Number(rest.type);
  if (rest.capacity_cft) input.capacity_cft = Number(rest.capacity_cft);
  print(await actions.updateVehicle(ctx, input));
}

export async function remove(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.deleteVehicle(ctx, { id: flags.id }));
}
