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
exports.dashboard = dashboard;
exports.availableWorkers = availableWorkers;
exports.jobsByStatus = jobsByStatus;
exports.revenue = revenue;
exports.workerUtilization = workerUtilization;
exports.upcoming = upcoming;
const actions = __importStar(require("../../actions"));
function print(result) {
    console.log(JSON.stringify(result, null, 2));
}
async function dashboard(ctx, flags) {
    print(await actions.getCompanyDashboardStats(ctx, { company_id: flags.company_id || ctx.companyId }));
}
async function availableWorkers(ctx, flags) {
    print(await actions.getAvailableWorkersForDate(ctx, {
        company_id: flags.company_id || ctx.companyId,
        date: flags.date,
    }));
}
async function jobsByStatus(ctx, flags) {
    print(await actions.getJobsByStatusThisWeek(ctx, { company_id: flags.company_id || ctx.companyId }));
}
async function revenue(ctx, flags) {
    print(await actions.getRevenueByMonth(ctx, {
        company_id: flags.company_id || ctx.companyId,
        start_date: flags.start_date,
        end_date: flags.end_date,
    }));
}
async function workerUtilization(ctx, flags) {
    print(await actions.getWorkerUtilization(ctx, {
        company_id: flags.company_id || ctx.companyId,
        start_date: flags.start_date,
        end_date: flags.end_date,
    }));
}
async function upcoming(ctx, flags) {
    print(await actions.getUpcomingJobs(ctx, {
        company_id: flags.company_id || ctx.companyId,
        days: Number(flags.days) || 7,
    }));
}
//# sourceMappingURL=analytics.js.map