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
exports.handleRequest = handleRequest;
const functions = __importStar(require("firebase-functions"));
const cors = require("cors");
const middleware_1 = require("./middleware");
const response_1 = require("./response");
const actions = __importStar(require("../actions"));
const corsHandler = cors({ origin: true });
function bodyWithCompany(req) {
    return req.body;
}
function idFromPath(req, match) {
    return { id: match[1] };
}
function bodyWithId(req, match) {
    return Object.assign(Object.assign({}, req.body), { id: match[1] });
}
function companyFromQuery(req) {
    return { company_id: req.query.company_id };
}
const routes = [
    // Jobs
    { method: "POST", pattern: /^\/jobs\/?$/, action: actions.createJob, extractInput: bodyWithCompany },
    { method: "GET", pattern: /^\/jobs\/([^/]+)$/, action: actions.getJob, extractInput: idFromPath },
    { method: "PUT", pattern: /^\/jobs\/([^/]+)$/, action: actions.updateJob, extractInput: bodyWithId },
    { method: "DELETE", pattern: /^\/jobs\/([^/]+)$/, action: actions.deleteJob, extractInput: idFromPath },
    { method: "GET", pattern: /^\/jobs\/?$/, action: actions.listJobsByCompany, extractInput: companyFromQuery },
    { method: "POST", pattern: /^\/jobs\/by-status\/?$/, action: actions.getJobsByStatus, extractInput: bodyWithCompany },
    { method: "POST", pattern: /^\/jobs\/by-date-range\/?$/, action: actions.getJobsByDateRange, extractInput: bodyWithCompany },
    { method: "POST", pattern: /^\/jobs\/by-customer\/?$/, action: actions.getJobsByCustomer, extractInput: bodyWithCompany },
    { method: "POST", pattern: /^\/jobs\/update-status\/?$/, action: actions.updateJobStatus, extractInput: bodyWithCompany },
    // Workers
    { method: "POST", pattern: /^\/workers\/?$/, action: actions.createWorker, extractInput: bodyWithCompany },
    { method: "GET", pattern: /^\/workers\/([^/]+)$/, action: actions.getWorker, extractInput: idFromPath },
    { method: "PUT", pattern: /^\/workers\/([^/]+)$/, action: actions.updateWorker, extractInput: bodyWithId },
    { method: "DELETE", pattern: /^\/workers\/([^/]+)$/, action: actions.deleteWorker, extractInput: idFromPath },
    { method: "GET", pattern: /^\/workers\/?$/, action: actions.listWorkersByCompany, extractInput: companyFromQuery },
    // Vehicles
    { method: "POST", pattern: /^\/vehicles\/?$/, action: actions.createVehicle, extractInput: bodyWithCompany },
    { method: "GET", pattern: /^\/vehicles\/([^/]+)$/, action: actions.getVehicle, extractInput: idFromPath },
    { method: "PUT", pattern: /^\/vehicles\/([^/]+)$/, action: actions.updateVehicle, extractInput: bodyWithId },
    { method: "DELETE", pattern: /^\/vehicles\/([^/]+)$/, action: actions.deleteVehicle, extractInput: idFromPath },
    { method: "GET", pattern: /^\/vehicles\/?$/, action: actions.listVehiclesByCompany, extractInput: companyFromQuery },
    // Equipment
    { method: "POST", pattern: /^\/equipment\/?$/, action: actions.createEquipment, extractInput: bodyWithCompany },
    { method: "GET", pattern: /^\/equipment\/([^/]+)$/, action: actions.getEquipment, extractInput: idFromPath },
    { method: "PUT", pattern: /^\/equipment\/([^/]+)$/, action: actions.updateEquipment, extractInput: bodyWithId },
    { method: "DELETE", pattern: /^\/equipment\/([^/]+)$/, action: actions.deleteEquipment, extractInput: idFromPath },
    { method: "GET", pattern: /^\/equipment\/?$/, action: actions.listEquipmentByCompany, extractInput: companyFromQuery },
    // Quotes
    { method: "POST", pattern: /^\/quotes\/?$/, action: actions.createQuote, extractInput: bodyWithCompany },
    { method: "GET", pattern: /^\/quotes\/([^/]+)$/, action: actions.getQuote, extractInput: idFromPath },
    { method: "PUT", pattern: /^\/quotes\/([^/]+)$/, action: actions.updateQuote, extractInput: bodyWithId },
    { method: "GET", pattern: /^\/quotes\/?$/, action: actions.listQuotesByCompany, extractInput: companyFromQuery },
    { method: "POST", pattern: /^\/quotes\/update-status\/?$/, action: actions.updateQuoteStatus, extractInput: bodyWithCompany },
    { method: "POST", pattern: /^\/quotes\/calculate\/?$/, action: actions.calculateAIQuoteAction, extractInput: bodyWithCompany },
    // Incidents
    { method: "POST", pattern: /^\/incidents\/?$/, action: actions.createIncident, extractInput: bodyWithCompany },
    { method: "GET", pattern: /^\/incidents\/([^/]+)$/, action: actions.getIncident, extractInput: idFromPath },
    { method: "PUT", pattern: /^\/incidents\/([^/]+)$/, action: actions.updateIncident, extractInput: bodyWithId },
    { method: "GET", pattern: /^\/incidents\/?$/, action: actions.listIncidentsByCompany, extractInput: companyFromQuery },
    // Payroll
    { method: "POST", pattern: /^\/payroll\/?$/, action: actions.createPayrollRecord, extractInput: bodyWithCompany },
    { method: "GET", pattern: /^\/payroll\/([^/]+)$/, action: actions.getPayrollRecord, extractInput: idFromPath },
    { method: "PUT", pattern: /^\/payroll\/([^/]+)$/, action: actions.updatePayrollRecord, extractInput: bodyWithId },
    { method: "DELETE", pattern: /^\/payroll\/([^/]+)$/, action: actions.deletePayrollRecord, extractInput: idFromPath },
    { method: "GET", pattern: /^\/payroll\/?$/, action: actions.listPayrollByCompany, extractInput: companyFromQuery },
    // Invitations
    { method: "POST", pattern: /^\/invitations\/?$/, action: actions.createInvitation, extractInput: bodyWithCompany },
    { method: "POST", pattern: /^\/invitations\/update-status\/?$/, action: actions.updateInvitationStatus, extractInput: bodyWithCompany },
    { method: "GET", pattern: /^\/invitations\/?$/, action: actions.listInvitationsByCompany, extractInput: companyFromQuery },
    // Company
    { method: "GET", pattern: /^\/company\/([^/]+)$/, action: actions.getCompany, extractInput: idFromPath },
    { method: "PUT", pattern: /^\/company\/([^/]+)$/, action: actions.updateCompany, extractInput: bodyWithId },
    // Scheduling
    { method: "POST", pattern: /^\/scheduling\/assign-worker\/?$/, action: actions.assignWorkerToJob, extractInput: bodyWithCompany },
    { method: "POST", pattern: /^\/scheduling\/unassign-worker\/?$/, action: actions.unassignWorkerFromJob, extractInput: bodyWithCompany },
    { method: "POST", pattern: /^\/scheduling\/assign-vehicle\/?$/, action: actions.assignVehicleToJob, extractInput: bodyWithCompany },
    { method: "POST", pattern: /^\/scheduling\/unassign-vehicle\/?$/, action: actions.unassignVehicleFromJob, extractInput: bodyWithCompany },
    { method: "POST", pattern: /^\/scheduling\/allocate-equipment\/?$/, action: actions.allocateEquipmentToJob, extractInput: bodyWithCompany },
    { method: "POST", pattern: /^\/scheduling\/deallocate-equipment\/?$/, action: actions.deallocateEquipmentFromJob, extractInput: bodyWithCompany },
    { method: "POST", pattern: /^\/scheduling\/worker-schedule\/?$/, action: actions.setWorkerSchedule, extractInput: bodyWithCompany },
    { method: "POST", pattern: /^\/scheduling\/vehicle-schedule\/?$/, action: actions.setVehicleSchedule, extractInput: bodyWithCompany },
    { method: "POST", pattern: /^\/scheduling\/equipment-schedule\/?$/, action: actions.setEquipmentSchedule, extractInput: bodyWithCompany },
    { method: "POST", pattern: /^\/scheduling\/worker-schedule-range\/?$/, action: actions.getWorkerScheduleRange, extractInput: bodyWithCompany },
    { method: "POST", pattern: /^\/scheduling\/vehicle-schedule-range\/?$/, action: actions.getVehicleScheduleRange, extractInput: bodyWithCompany },
    { method: "POST", pattern: /^\/scheduling\/equipment-schedule-range\/?$/, action: actions.getEquipmentScheduleRange, extractInput: bodyWithCompany },
    // API Keys
    { method: "POST", pattern: /^\/api-keys\/?$/, action: actions.createApiKey, extractInput: bodyWithCompany },
    { method: "GET", pattern: /^\/api-keys\/?$/, action: actions.listApiKeysByCompany, extractInput: companyFromQuery },
    { method: "DELETE", pattern: /^\/api-keys\/([^/]+)$/, action: actions.revokeApiKey, extractInput: idFromPath },
    // Analytics
    { method: "POST", pattern: /^\/analytics\/available-workers\/?$/, action: actions.getAvailableWorkersForDate, extractInput: bodyWithCompany },
    { method: "POST", pattern: /^\/analytics\/jobs-by-status\/?$/, action: actions.getJobsByStatusThisWeek, extractInput: bodyWithCompany },
    { method: "POST", pattern: /^\/analytics\/revenue-by-month\/?$/, action: actions.getRevenueByMonth, extractInput: bodyWithCompany },
    { method: "POST", pattern: /^\/analytics\/dashboard\/?$/, action: actions.getCompanyDashboardStats, extractInput: bodyWithCompany },
    { method: "POST", pattern: /^\/analytics\/worker-utilization\/?$/, action: actions.getWorkerUtilization, extractInput: bodyWithCompany },
    { method: "POST", pattern: /^\/analytics\/upcoming-jobs\/?$/, action: actions.getUpcomingJobs, extractInput: bodyWithCompany },
];
async function handleRequest(req, res) {
    corsHandler(req, res, async () => {
        // Strip /api prefix if present
        const path = req.path.replace(/^\/api(?=\/|$)/, "") || "/";
        const method = req.method.toUpperCase();
        // Auth
        const ctx = await (0, middleware_1.extractAuthContext)(req);
        if (!ctx) {
            res.status(401).json((0, response_1.jsonError)("Unauthorized", 401).body);
            return;
        }
        // Find matching route
        for (const route of routes) {
            if (route.method !== method)
                continue;
            const match = path.match(route.pattern);
            if (!match)
                continue;
            try {
                const input = route.extractInput(req, match);
                const result = await route.action(ctx, input);
                const response = (0, response_1.actionToResponse)(result);
                res.status(response.status).json(response.body);
            }
            catch (e) {
                functions.logger.error("Action error", e);
                res.status(500).json((0, response_1.jsonError)("Internal server error", 500).body);
            }
            return;
        }
        res.status(404).json((0, response_1.jsonError)("Not found", 404).body);
    });
}
//# sourceMappingURL=router.js.map