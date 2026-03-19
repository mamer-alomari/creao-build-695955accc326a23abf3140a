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
function createMcpServer(companyId) {
    const server = new mcp_js_1.McpServer({
        name: "creao",
        version: "1.0.0",
    });
    const ctx = (0, auth_context_1.serviceAccountContext)(companyId);
    for (const tool of tools_1.toolDefinitions) {
        const schema = validatorMap[tool.schema];
        if (!schema)
            continue;
        const jsonSchema = (0, zod_to_json_schema_1.zodToJsonSchema)(schema, { target: "openApi3" });
        const properties = jsonSchema.properties || {};
        const required = jsonSchema.required || [];
        // Build zod shape for MCP tool registration
        const shape = {};
        for (const [key, prop] of Object.entries(properties)) {
            if (prop.type === "string") {
                shape[key] = required.includes(key) ? zod_1.z.string() : zod_1.z.string().optional();
            }
            else if (prop.type === "number" || prop.type === "integer") {
                shape[key] = required.includes(key) ? zod_1.z.number() : zod_1.z.number().optional();
            }
            else if (prop.type === "boolean") {
                shape[key] = required.includes(key) ? zod_1.z.boolean() : zod_1.z.boolean().optional();
            }
            else if (prop.type === "array") {
                shape[key] = required.includes(key) ? zod_1.z.array(zod_1.z.any()) : zod_1.z.array(zod_1.z.any()).optional();
            }
            else {
                shape[key] = zod_1.z.any().optional();
            }
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