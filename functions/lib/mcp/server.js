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
exports.createMcpServer = createMcpServer;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const zod_to_json_schema_1 = require("zod-to-json-schema");
const auth_context_1 = require("../lib/auth-context");
const tools_1 = require("./tools");
const validators = __importStar(require("../lib/validators"));
const validatorMap = validators;
/**
 * Recursively convert a JSON Schema property to a Zod schema,
 * preserving nested objects, arrays of objects, and unions.
 */
function jsonSchemaPropertyToZod(prop, isRequired) {
    if (!prop)
        return zod_1.z.any().optional();
    // Handle oneOf / anyOf (unions like string | number)
    if (prop.oneOf || prop.anyOf) {
        const variants = (prop.oneOf || prop.anyOf).map((v) => jsonSchemaPropertyToZod(v, true));
        if (variants.length === 2) {
            const base = zod_1.z.union([variants[0], variants[1]]);
            return isRequired ? base : base.optional();
        }
        return isRequired ? zod_1.z.any() : zod_1.z.any().optional();
    }
    if (prop.type === "string") {
        if (prop.enum) {
            const base = zod_1.z.enum(prop.enum);
            return isRequired ? base : base.optional();
        }
        return isRequired ? zod_1.z.string() : zod_1.z.string().optional();
    }
    if (prop.type === "number" || prop.type === "integer") {
        return isRequired ? zod_1.z.number() : zod_1.z.number().optional();
    }
    if (prop.type === "boolean") {
        return isRequired ? zod_1.z.boolean() : zod_1.z.boolean().optional();
    }
    if (prop.type === "array") {
        let itemSchema = zod_1.z.any();
        if (prop.items) {
            itemSchema = jsonSchemaPropertyToZod(prop.items, true);
        }
        const base = zod_1.z.array(itemSchema);
        return isRequired ? base : base.optional();
    }
    if (prop.type === "object" && prop.properties) {
        const shape = {};
        const reqFields = prop.required || [];
        for (const [k, v] of Object.entries(prop.properties)) {
            shape[k] = jsonSchemaPropertyToZod(v, reqFields.includes(k));
        }
        const base = zod_1.z.object(shape);
        return isRequired ? base : base.optional();
    }
    // Fallback for anything we can't parse
    return isRequired ? zod_1.z.any() : zod_1.z.any().optional();
}
function createMcpServer(companyId) {
    const server = new mcp_js_1.McpServer({
        name: "creao",
        version: "1.0.0",
    });
    const ctx = (0, auth_context_1.serviceAccountContext)(companyId);
    let registeredCount = 0;
    for (const tool of tools_1.toolDefinitions) {
        const schema = validatorMap[tool.schema];
        if (!schema) {
            console.warn(`[MCP] WARNING: Missing validator "${tool.schema}" for tool "${tool.name}" — skipping`);
            continue;
        }
        const jsonSchema = (0, zod_to_json_schema_1.zodToJsonSchema)(schema, { target: "openApi3" });
        const properties = jsonSchema.properties || {};
        const required = jsonSchema.required || [];
        const shape = {};
        for (const [key, prop] of Object.entries(properties)) {
            shape[key] = jsonSchemaPropertyToZod(prop, required.includes(key));
        }
        server.tool(tool.name, tool.description, shape, async (params) => {
            const result = await tool.action(ctx, params);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        });
        registeredCount++;
    }
    console.log(`[MCP] Registered ${registeredCount}/${tools_1.toolDefinitions.length} tools`);
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
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
}
if (require.main === module) {
    main().catch((e) => {
        console.error("MCP server error:", e);
        process.exit(1);
    });
}
//# sourceMappingURL=server.js.map