import { AuthContext } from "../../actions/_base";
import * as actions from "../../actions";

function print(result: any) {
  console.log(JSON.stringify(result, null, 2));
}

export async function dashboard(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.getCompanyDashboardStats(ctx, { company_id: flags.company_id || ctx.companyId }));
}

export async function availableWorkers(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.getAvailableWorkersForDate(ctx, {
    company_id: flags.company_id || ctx.companyId,
    date: flags.date,
  }));
}

export async function jobsByStatus(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.getJobsByStatusThisWeek(ctx, { company_id: flags.company_id || ctx.companyId }));
}

export async function revenue(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.getRevenueByMonth(ctx, {
    company_id: flags.company_id || ctx.companyId,
    start_date: flags.start_date,
    end_date: flags.end_date,
  }));
}

export async function workerUtilization(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.getWorkerUtilization(ctx, {
    company_id: flags.company_id || ctx.companyId,
    start_date: flags.start_date,
    end_date: flags.end_date,
  }));
}

export async function upcoming(ctx: AuthContext, flags: Record<string, string>) {
  print(await actions.getUpcomingJobs(ctx, {
    company_id: flags.company_id || ctx.companyId,
    days: Number(flags.days) || 7,
  }));
}
