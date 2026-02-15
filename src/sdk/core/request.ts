import { getAuthTokenAsync } from "./auth";

const MCP_API_BASE_PATH = import.meta.env.VITE_MCP_API_BASE_PATH;

/**
 * a simple wrapper for `fetch` with authentication token and error handling
 */
export async function platformRequest(
	url: string | URL | Request,
	options: RequestInit = {},
): Promise<Response> {
	const token = await getAuthTokenAsync();
	const method = options.method || "GET";

	const headers = new Headers(options.headers);
	if (token) {
		headers.set("Authorization", `Bearer ${token}`);
	}
	if (typeof url === 'object' && url && 'headers' in url) {
		url.headers?.forEach?.((value, key) => {
			headers.set(key, value);
		});
	}
	if (!headers.has("Content-Type") && method !== "GET") {
		headers.set("Content-Type", "application/json");
	}

	const realUrl = typeof url === "string" ? new URL(url, MCP_API_BASE_PATH) : url;
	const response = await fetch(realUrl, {
		...options,
		headers,
	});

	// Log API request in development
	if (import.meta.env.MODE === 'development') {
		console.log('[API Request]', {
			url: response.url,
			method,
			status: response.status,
			timestamp: new Date().toISOString(),
		});
	}

	// Validate response status and throw error if not OK (200-299)
	if (!response.ok) {
		const errorBody = await response.text().catch(() => "Unable to parse error response");
		const error = new Error(
			`HTTP ${response.status}: ${response.statusText}${errorBody ? ` - ${errorBody}` : ""}`
		);
		(error as any).response = response;
		(error as any).status = response.status;
		(error as any).statusText = response.statusText;
		throw error;
	}

	return response;
}

/**
 * simpler wrapper for `platformRequest` with common methods
 *
 * eg: `platformApi.get("/api/users").then(r=>r.json())`
 */
export const platformApi = {
	get: async (url: string, options?: RequestInit) => {
		return platformRequest(url, { ...options, method: "GET" });
	},

	post: async (url: string, data?: unknown, options?: RequestInit) => {
		return platformRequest(url, {
			...options,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...options?.headers,
			},
			body: data ? JSON.stringify(data) : undefined,
		});
	},

	put: async (url: string, data?: unknown, options?: RequestInit) => {
		return platformRequest(url, {
			...options,
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				...options?.headers,
			},
			body: data ? JSON.stringify(data) : undefined,
		});
	},

	delete: async (url: string, options?: RequestInit) => {
		return platformRequest(url, { ...options, method: "DELETE" });
	},
};
