#!/usr/bin/env node
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
const auth_context_1 = require("../lib/auth-context");
const jobsCmd = __importStar(require("./commands/jobs"));
const workersCmd = __importStar(require("./commands/workers"));
const vehiclesCmd = __importStar(require("./commands/vehicles"));
const schedulingCmd = __importStar(require("./commands/scheduling"));
const analyticsCmd = __importStar(require("./commands/analytics"));
const COMMANDS = {
    jobs: jobsCmd,
    workers: workersCmd,
    vehicles: vehiclesCmd,
    scheduling: schedulingCmd,
    analytics: analyticsCmd,
};
function parseArgs(argv) {
    const [domain, command, ...rest] = argv;
    const flags = {};
    for (let i = 0; i < rest.length; i++) {
        if (rest[i].startsWith("--")) {
            const key = rest[i].slice(2).replace(/-/g, "_");
            flags[key] = rest[i + 1] || "";
            i++;
        }
    }
    return { domain: domain || "", command: command || "", flags };
}
function printUsage() {
    console.log("Usage: creao <domain> <command> [--flag value ...]");
    console.log("");
    console.log("Domains: jobs, workers, vehicles, scheduling, analytics");
    console.log("");
    console.log("Examples:");
    console.log("  creao jobs list --company_id abc123");
    console.log("  creao analytics dashboard --company_id abc123");
    console.log("  creao workers list --company_id abc123");
    console.log("");
    console.log("Environment:");
    console.log("  CREAO_COMPANY_ID  Default company ID");
    console.log("  CREAO_MODE        'local' (direct) or 'remote' (REST API)");
}
async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0 || args[0] === "help" || args[0] === "--help") {
        printUsage();
        process.exit(0);
    }
    const { domain, command, flags } = parseArgs(args);
    const companyId = flags.company_id || process.env.CREAO_COMPANY_ID;
    if (!companyId) {
        console.error("Error: --company_id or CREAO_COMPANY_ID required");
        process.exit(1);
    }
    const ctx = (0, auth_context_1.serviceAccountContext)(companyId);
    const domainCommands = COMMANDS[domain];
    if (!domainCommands) {
        console.error(`Unknown domain: ${domain}. Available: ${Object.keys(COMMANDS).join(", ")}`);
        process.exit(1);
    }
    const handler = domainCommands[command];
    if (!handler) {
        console.error(`Unknown command: ${domain} ${command}. Available: ${Object.keys(domainCommands).join(", ")}`);
        process.exit(1);
    }
    try {
        await handler(ctx, flags);
    }
    catch (e) {
        console.error(`Error: ${e.message}`);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=index.js.map