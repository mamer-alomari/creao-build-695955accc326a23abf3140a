import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { serviceAccountContext } from "../lib/auth-context";
import { toolDefinitions } from "./tools";
import * as validators from "../lib/validators";

const validatorMap: Record<string, z.ZodSchema> = validators as any;

/**
 * Recursively convert a JSON Schema property to a Zod schema,
 * preserving nested objects, arrays of objects, and unions.
 */
function jsonSchemaPropertyToZod(prop: any, isRequired: boolean): z.ZodTypeAny {
  if (!prop) return z.any().optional();

  // Handle oneOf / anyOf (unions like string | number)
  if (prop.oneOf || prop.anyOf) {
    const variants = (prop.oneOf || prop.anyOf).map((v: any) => jsonSchemaPropertyToZod(v, true));
    if (variants.length === 2) {
      const base = z.union([variants[0], variants[1]]);
      return isRequired ? base : base.optional();
    }
    return isRequired ? z.any() : z.any().optional();
  }

  if (prop.type === "string") {
    if (prop.enum) {
      const base = z.enum(prop.enum as [string, ...string[]]);
      return isRequired ? base : base.optional();
    }
    return isRequired ? z.string() : z.string().optional();
  }

  if (prop.type === "number" || prop.type === "integer") {
    return isRequired ? z.number() : z.number().optional();
  }

  if (prop.type === "boolean") {
    return isRequired ? z.boolean() : z.boolean().optional();
  }

  if (prop.type === "array") {
    let itemSchema: z.ZodTypeAny = z.any();
    if (prop.items) {
      itemSchema = jsonSchemaPropertyToZod(prop.items, true);
    }
    const base = z.array(itemSchema);
    return isRequired ? base : base.optional();
  }

  if (prop.type === "object" && prop.properties) {
    const shape: Record<string, z.ZodTypeAny> = {};
    const reqFields: string[] = prop.required || [];
    for (const [k, v] of Object.entries(prop.properties)) {
      shape[k] = jsonSchemaPropertyToZod(v, reqFields.includes(k));
    }
    const base = z.object(shape);
    return isRequired ? base : base.optional();
  }

  // Fallback for anything we can't parse
  return isRequired ? z.any() : z.any().optional();
}

export function createMcpServer(companyId: string): McpServer {
  const server = new McpServer({
    name: "creao",
    version: "1.0.0",
  });

  const ctx = serviceAccountContext(companyId);
  let registeredCount = 0;

  for (const tool of toolDefinitions) {
    const schema = validatorMap[tool.schema];
    if (!schema) {
      console.warn(`[MCP] WARNING: Missing validator "${tool.schema}" for tool "${tool.name}" — skipping`);
      continue;
    }

    const jsonSchema = zodToJsonSchema(schema, { target: "openApi3" });
    const properties = (jsonSchema as any).properties || {};
    const required: string[] = (jsonSchema as any).required || [];

    const shape: Record<string, z.ZodTypeAny> = {};
    for (const [key, prop] of Object.entries(properties)) {
      shape[key] = jsonSchemaPropertyToZod(prop, required.includes(key));
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
    registeredCount++;
  }

  console.log(`[MCP] Registered ${registeredCount}/${toolDefinitions.length} tools`);

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
