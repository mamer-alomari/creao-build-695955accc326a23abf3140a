import * as functions from "firebase-functions";
import cors = require("cors");
import { extractAuthContext } from "./middleware";
import { actionToResponse, jsonError } from "./response";
import { AuthContext } from "../lib/auth-context";
import * as actions from "../actions";

const corsHandler = cors({ origin: true });

type ActionFn = (ctx: AuthContext, input: unknown) => Promise<any>;

// Route map: method + path pattern → action function
interface Route {
  method: "GET" | "POST" | "PUT" | "DELETE";
  pattern: RegExp;
  action: ActionFn;
  extractInput: (req: functions.https.Request, match: RegExpMatchArray) => unknown;
}

function bodyWithCompany(req: functions.https.Request): unknown {
  return req.body;
}

function idFromPath(req: functions.https.Request, match: RegExpMatchArray): unknown {
  return { id: match[1] };
}

function bodyWithId(req: functions.https.Request, match: RegExpMatchArray): unknown {
  return { ...req.body, id: match[1] };
}

function companyFromQuery(req: functions.https.Request): unknown {
  return { company_id: req.query.company_id };
}

const routes: Route[] = [
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

  // Analytics
  { method: "POST", pattern: /^\/analytics\/available-workers\/?$/, action: actions.getAvailableWorkersForDate, extractInput: bodyWithCompany },
  { method: "POST", pattern: /^\/analytics\/jobs-by-status\/?$/, action: actions.getJobsByStatusThisWeek, extractInput: bodyWithCompany },
  { method: "POST", pattern: /^\/analytics\/revenue-by-month\/?$/, action: actions.getRevenueByMonth, extractInput: bodyWithCompany },
  { method: "POST", pattern: /^\/analytics\/dashboard\/?$/, action: actions.getCompanyDashboardStats, extractInput: bodyWithCompany },
  { method: "POST", pattern: /^\/analytics\/worker-utilization\/?$/, action: actions.getWorkerUtilization, extractInput: bodyWithCompany },
  { method: "POST", pattern: /^\/analytics\/upcoming-jobs\/?$/, action: actions.getUpcomingJobs, extractInput: bodyWithCompany },
];

export async function handleRequest(req: functions.https.Request, res: functions.Response): Promise<void> {
  corsHandler(req, res, async () => {
    // Strip /api prefix if present
    const path = req.path.replace(/^\/api/, "") || "/";
    const method = req.method.toUpperCase();

    // Auth
    const ctx = await extractAuthContext(req);
    if (!ctx) {
      res.status(401).json(jsonError("Unauthorized", 401).body);
      return;
    }

    // Find matching route
    for (const route of routes) {
      if (route.method !== method) continue;
      const match = path.match(route.pattern);
      if (!match) continue;

      try {
        const input = route.extractInput(req, match);
        const result = await route.action(ctx, input);
        const response = actionToResponse(result);
        res.status(response.status).json(response.body);
      } catch (e: any) {
        functions.logger.error("Action error", e);
        res.status(500).json(jsonError("Internal server error", 500).body);
      }
      return;
    }

    res.status(404).json(jsonError("Not found", 404).body);
  });
}
