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
async function extractAuthContext(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }
    const token = authHeader.slice(7);
    // Support service-account mode with a special prefix
    if (token.startsWith("sa:")) {
        const companyId = req.headers["x-company-id"];
        if (!companyId)
            return null;
        return (0, auth_context_1.serviceAccountContext)(companyId);
    }
    try {
        return await (0, auth_context_1.authContextFromToken)(token);
    }
    catch (e) {
        functions.logger.warn("Failed to verify token", e);
        return null;
    }
}
//# sourceMappingURL=middleware.js.map