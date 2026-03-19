import * as functions from "firebase-functions";
import { AuthContext } from "../lib/auth-context";
import { authContextFromToken, serviceAccountContext } from "../lib/auth-context";
import { authContextFromApiKey } from "../actions/api-keys";

/**
 * Service-account secret. Set CREAO_SA_SECRET in .env or Cloud Functions env vars.
 */
function getSaSecret(): string | undefined {
  return process.env.CREAO_SA_SECRET || functions.config().creao?.sa_secret;
}

export async function extractAuthContext(req: functions.https.Request): Promise<AuthContext | null> {
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
    const companyId = req.headers["x-company-id"] as string;
    if (!companyId) return null;
    return serviceAccountContext(companyId);
  }

  // Company API key mode: Bearer ak_<key>
  if (token.startsWith("ak_")) {
    try {
      return await authContextFromApiKey(token);
    } catch (e) {
      functions.logger.warn("Failed to verify API key", e);
      return null;
    }
  }

  // Firebase ID token
  try {
    return await authContextFromToken(token);
  } catch (e) {
    functions.logger.warn("Failed to verify token", e);
    return null;
  }
}
