import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { serviceAccountContext } from "../lib/auth-context";
import { toolDefinitions } from "./tools";
import * as validators from "../lib/validators";

const validatorMap: Record<string, z.ZodSchema> = validators as any;

export function createMcpServer(companyId: string): McpServer {
  const server = new McpServer({
    name: "creao",
    version: "1.0.0",
  });

  const ctx = serviceAccountContext(companyId);

  for (const tool of toolDefinitions) {
    const schema = validatorMap[tool.schema];
    if (!schema) continue;

    const jsonSchema = zodToJsonSchema(schema, { target: "openApi3" });
    const properties = (jsonSchema as any).properties || {};
    const required = (jsonSchema as any).required || [];

    // Build zod shape for MCP tool registration
    const shape: Record<string, any> = {};
    for (const [key, prop] of Object.entries(properties) as any) {
      if (prop.type === "string") {
        shape[key] = required.includes(key) ? z.string() : z.string().optional();
      } else if (prop.type === "number" || prop.type === "integer") {
        shape[key] = required.includes(key) ? z.number() : z.number().optional();
      } else if (prop.type === "boolean") {
        shape[key] = required.includes(key) ? z.boolean() : z.boolean().optional();
      } else if (prop.type === "array") {
        shape[key] = required.includes(key) ? z.array(z.any()) : z.array(z.any()).optional();
      } else {
        shape[key] = z.any().optional();
      }
    }

    server.tool(
      tool.name,
      tool.description,
      shape,
      async (params: Record<string, unknown>) => {
        const result = await tool.action(ctx, params);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
    );
  }

  return server;
}

// Stdio entry point for local usage
async function main() {
  const companyId = process.argv[2] || process.env.CREAO_COMPANY_ID;
  if (!companyId) {
    console.error("Usage: creao-mcp <company-id> OR set CREAO_COMPANY_ID env var");
    process.exit(1);
  }

  const server = createMcpServer(companyId);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (require.main === module) {
  main().catch((e) => {
    console.error("MCP server error:", e);
    process.exit(1);
  });
}
