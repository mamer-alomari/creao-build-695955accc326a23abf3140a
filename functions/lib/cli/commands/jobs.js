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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.get = get;
exports.create = create;
exports.update = update;
exports.remove = remove;
exports.status = status;
exports.byStatus = byStatus;
exports.byDateRange = byDateRange;
exports.byCustomer = byCustomer;
const actions = __importStar(require("../../actions"));
function print(result) {
    console.log(JSON.stringify(result, null, 2));
}
async function list(ctx, flags) {
    print(await actions.listJobsByCompany(ctx, { company_id: flags.company_id || ctx.companyId }));
}
async function get(ctx, flags) {
    print(await actions.getJob(ctx, { id: flags.id }));
}
async function create(ctx, flags) {
    print(await actions.createJob(ctx, {
        company_id: flags.company_id || ctx.companyId,
        customer_name: flags.customer_name,
        scheduled_date: flags.scheduled_date,
        pickup_address: flags.pickup_address,
        dropoff_address: flags.dropoff_address,
        distance: flags.distance,
    }));
}
async function update(ctx, flags) {
    const { id } = flags, rest = __rest(flags, ["id"]);
    print(await actions.updateJob(ctx, Object.assign({ id }, rest)));
}
async function remove(ctx, flags) {
    print(await actions.deleteJob(ctx, { id: flags.id }));
}
async function status(ctx, flags) {
    print(await actions.updateJobStatus(ctx, { id: flags.id, status: Number(flags.status) }));
}
async function byStatus(ctx, flags) {
    print(await actions.getJobsByStatus(ctx, {
        company_id: flags.company_id || ctx.companyId,
        status: Number(flags.status),
    }));
}
async function byDateRange(ctx, flags) {
    print(await actions.getJobsByDateRange(ctx, {
        company_id: flags.company_id || ctx.companyId,
        start_date: flags.start_date,
        end_date: flags.end_date,
    }));
}
async function byCustomer(ctx, flags) {
    print(await actions.getJobsByCustomer(ctx, {
        company_id: flags.company_id || ctx.companyId,
        customer_name: flags.customer_name,
    }));
}
//# sourceMappingURL=jobs.js.map