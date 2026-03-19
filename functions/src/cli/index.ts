#!/usr/bin/env node

import { serviceAccountContext } from "../lib/auth-context";
import { AuthContext } from "../actions/_base";
import * as jobsCmd from "./commands/jobs";
import * as workersCmd from "./commands/workers";
import * as vehiclesCmd from "./commands/vehicles";
import * as schedulingCmd from "./commands/scheduling";
import * as analyticsCmd from "./commands/analytics";

const COMMANDS: Record<string, Record<string, (ctx: AuthContext, args: Record<string, string>) => Promise<void>>> = {
  jobs: jobsCmd,
  workers: workersCmd,
  vehicles: vehiclesCmd,
  scheduling: schedulingCmd,
  analytics: analyticsCmd,
};

function parseArgs(argv: string[]): { domain: string; command: string; flags: Record<string, string> } {
  const [domain, command, ...rest] = argv;
  const flags: Record<string, string> = {};

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

  const ctx = serviceAccountContext(companyId);
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
  } catch (e: any) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}

main();
