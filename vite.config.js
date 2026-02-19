import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import svgr from "vite-plugin-svgr";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	console.log("DEBUG: Loaded ENV keys:", Object.keys(env));
	console.log("DEBUG: VITE_FIREBASE_API_KEY:", env.VITE_FIREBASE_API_KEY);
	return {
		base: process.env.TENANT_ID ? `/${process.env.TENANT_ID}/` : "/",
		define: {
			"import.meta.env.TENANT_ID": JSON.stringify(process.env.TENANT_ID || ""),
			"import.meta.env.VITE_FIREBASE_API_KEY": JSON.stringify(
				env.VITE_FIREBASE_API_KEY,
			),
			"import.meta.env.VITE_FIREBASE_AUTH_DOMAIN": JSON.stringify(
				env.VITE_FIREBASE_AUTH_DOMAIN,
			),
			"import.meta.env.VITE_FIREBASE_PROJECT_ID": JSON.stringify(
				env.VITE_FIREBASE_PROJECT_ID,
			),
			"import.meta.env.VITE_FIREBASE_STORAGE_BUCKET": JSON.stringify(
				env.VITE_FIREBASE_STORAGE_BUCKET,
			),
			"import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID": JSON.stringify(
				env.VITE_FIREBASE_MESSAGING_SENDER_ID,
			),
			"import.meta.env.VITE_FIREBASE_APP_ID": JSON.stringify(
				env.VITE_FIREBASE_APP_ID,
			),
			"import.meta.env.VITE_FIREBASE_MEASUREMENT_ID": JSON.stringify(
				env.VITE_FIREBASE_MEASUREMENT_ID,
			),
		},
		plugins: [
			// ...creaoPlugins(),
			TanStackRouterVite({
				autoCodeSplitting: false, // affects pick-n-edit feature. disabled for now.
			}),
			viteReact({
				jsxRuntime: "automatic",
			}),
			svgr(),
			tailwindcss(),
		],
		resolve: {
			alias: {
				"@": resolve(__dirname, "./src"),
			},
		},
		server: {
			host: "0.0.0.0",
			port: parseInt(process.env.PORT || "3000"),
			allowedHosts: true, // respond to *any* Host header
			watch: {
				usePolling: true,
				interval: 300, // ms; tune if CPU gets high
			},
		},
		build: {
			chunkSizeWarningLimit: 1500,
		},
	};
});
