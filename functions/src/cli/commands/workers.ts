import { AuthContext } from "../../actions/_base";
import * as actions from "../../actions";

function print(result: any) {
  console.log(JSON.stringify(result, null, 2));
}

export async function list(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.listWorkersByCompany(ctx, { company_id: flags.company_id || ctx.companyId }));
}

export async function get(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.getWorker(ctx, { id: flags.id }));
}

export async function create(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.createWorker(ctx, {
    company_id: flags.company_id || ctx.companyId,
    full_name: flags.full_name,
    role: flags.role as any,
    email: flags.email,
    phone_number: flags.phone_number,
    hourly_rate: flags.hourly_rate ? Number(flags.hourly_rate) : undefined,
  }));
}

export async function update(ctx: AuthContext, flags: Record<string, string>) {
  const { id, ...rest } = flags;
  const input: any = { id };
  if (rest.full_name) input.full_name = rest.full_name;
  if (rest.role) input.role = rest.role;
  if (rest.email) input.email = rest.email;
  if (rest.hourly_rate) input.hourly_rate = Number(rest.hourly_rate);
  print(await actions.updateWorker(ctx, input));
}

export async function remove(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.deleteWorker(ctx, { id: flags.id }));
}
