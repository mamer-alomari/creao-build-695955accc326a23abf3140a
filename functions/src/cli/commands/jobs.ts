import { AuthContext } from "../../actions/_base";
import * as actions from "../../actions";

function print(result: any) {
  console.log(JSON.stringify(result, null, 2));
}

export async function list(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.listJobsByCompany(ctx, { company_id: flags.company_id || ctx.companyId }));
}

export async function get(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.getJob(ctx, { id: flags.id }));
}

export async function create(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.createJob(ctx, {
    company_id: flags.company_id || ctx.companyId,
    customer_name: flags.customer_name,
    scheduled_date: flags.scheduled_date,
    pickup_address: flags.pickup_address,
    dropoff_address: flags.dropoff_address,
    distance: flags.distance,
  }));
}

export async function update(ctx: AuthContext, flags: Record<string, string>) {
  const { id, ...rest } = flags;
  print(await actions.updateJob(ctx, { id, ...rest }));
}

export async function remove(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.deleteJob(ctx, { id: flags.id }));
}

export async function status(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.updateJobStatus(ctx, { id: flags.id, status: Number(flags.status) }));
}

export async function byStatus(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.getJobsByStatus(ctx, {
    company_id: flags.company_id || ctx.companyId,
    status: Number(flags.status),
  }));
}

export async function byDateRange(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.getJobsByDateRange(ctx, {
    company_id: flags.company_id || ctx.companyId,
    start_date: flags.start_date,
    end_date: flags.end_date,
  }));
}

export async function byCustomer(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.getJobsByCustomer(ctx, {
    company_id: flags.company_id || ctx.companyId,
    customer_name: flags.customer_name,
  }));
}
