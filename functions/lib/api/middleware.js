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
exports.extractAuthContext = extractAuthContext;
const functions = __importStar(require("firebase-functions"));
const auth_context_1 = require("../lib/auth-context");
const api_keys_1 = require("../actions/api-keys");
/**
 * Service-account secret. Set CREAO_SA_SECRET in .env or Cloud Functions env vars.
 */
function getSaSecret() {
    var _a;
    return process.env.CREAO_SA_SECRET || ((_a = functions.config().creao) === null || _a === void 0 ? void 0 : _a.sa_secret);
}
async function extractAuthContext(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }
    const token = authHeader.slice(7);
    // Service-account mode: Bearer sa:<secret>
    if (token.startsWith("sa:")) {
        const secret = token.slice(3);
        const expected = getSaSecret();
        if (!expected || secret !== expected) {
            functions.logger.warn("Invalid service-account secret");
            return null;
        }
        const companyId = req.headers["x-company-id"];
        if (!companyId)
            return null;
        return (0, auth_context_1.serviceAccountContext)(companyId);
    }
    // Company API key mode: Bearer ak_<key>
    if (token.startsWith("ak_")) {
        try {
            return await (0, api_keys_1.authContextFromApiKey)(token);
        }
        catch (e) {
            functions.logger.warn("Failed to verify API key", e);
            return null;
        }
    }
    // Firebase ID token
    try {
        return await (0, auth_context_1.authContextFromToken)(token);
    }
    catch (e) {
        functions.logger.warn("Failed to verify token", e);
        return null;
    }
}
//# sourceMappingURL=middleware.js.map