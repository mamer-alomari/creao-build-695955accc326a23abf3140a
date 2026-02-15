/**
 * Simplified event handler wrapper for standalone Firebase deployment
 *
 * This file previously contained iframe communication logic (reportToParentWindow)
 * which has been removed since the app is deployed directly on Firebase, not in an iframe.
 *
 * The useDelegatedComponentEventHandler hook is retained to provide error handling
 * and logging for UI components.
 */

import { useCallback, useRef } from "react";

interface ErrorInfo {
	componentType?: string;
	eventType?: string;
	componentInfo?: Record<string, unknown>;
}

/**
 * Delegated event handler that wraps component callbacks with error handling
 * @param callback - Original event handler callback
 * @param infoGetter - Function to get component info for error reporting
 * @param element - Optional HTML element reference
 * @returns Wrapped callback with error handling
 *
 * @example
 * const handleClick = useDelegatedComponentEventHandler(
 *   props.onClick,
 *   () => ({
 *     componentType: "button",
 *     eventType: "click",
 *     componentInfo: { variant, className, size },
 *   }),
 * );
 */
export function useDelegatedComponentEventHandler<T extends unknown[]>(
	callback: ((...args: T) => void) | null | undefined,
	infoGetter: (...args: T) => ErrorInfo,
	element?: HTMLElement | null,
) {
	const lastInfoGetter = useRef(infoGetter);
	lastInfoGetter.current = infoGetter;

	const lastCallback = useRef(callback);
	lastCallback.current = callback;

	const lastElement = useRef(element);
	lastElement.current = element;

	const delegatedCallback = useCallback((...args: T) => {
		if (typeof lastCallback.current !== "function") return;

		const info = lastInfoGetter.current(...args);

		const handleError = (error: unknown) => {
			const errorObj = error instanceof Error ? error : new Error(String(error));

			// Log error locally with context
			console.error('[Component Error]', {
				...info,
				error: {
					message: errorObj.message,
					stack: errorObj.stack,
				},
				timestamp: new Date().toISOString(),
			});

			// Re-throw so React error boundaries can catch it
			throw error;
		};

		try {
			// Execute the original callback
			// biome-ignore lint/suspicious/noExplicitAny: callback return type varies
			const result = lastCallback.current(...args) as any;

			// Handle promise rejections
			if (result instanceof Promise) {
				result.catch(handleError);
			}
		} catch (error) {
			handleError(error);
		}
	}, []);

	return delegatedCallback;
}

/**
 * Global error handlers for unhandled rejections and errors
 * Logs errors to console for debugging
 */

// Store handler references for potential cleanup
const errorHandlers = {
	unhandledRejection: (event: PromiseRejectionEvent) => {
		console.error('[Unhandled Promise Rejection]', {
			reason: event.reason,
			promise: event.promise,
			timestamp: new Date().toISOString(),
		});
	},
	error: (event: ErrorEvent) => {
		console.error('[Global Error]', {
			message: event.message,
			filename: event.filename,
			lineno: event.lineno,
			colno: event.colno,
			error: event.error,
			timestamp: new Date().toISOString(),
		});
	}
};

/**
 * Initialize global error handlers
 * Called automatically when module loads
 */
function initializeErrorHandlers() {
	if (typeof window !== 'undefined') {
		window.addEventListener("unhandledrejection", errorHandlers.unhandledRejection);
		window.addEventListener("error", errorHandlers.error);
	}
}

/**
 * Cleanup global error handlers
 * Exposed for testing or special cases where cleanup is needed
 */
export function cleanupErrorHandlers() {
	if (typeof window !== 'undefined') {
		window.removeEventListener("unhandledrejection", errorHandlers.unhandledRejection);
		window.removeEventListener("error", errorHandlers.error);
	}
}

// Initialize handlers on module load
// Initialize handlers on module load
initializeErrorHandlers();

/**
 * Report a general error
 */
export function reportError(error: unknown, info?: Record<string, unknown>) {
	console.error('[Reported Error]', {
		error,
		info,
		timestamp: new Date().toISOString(),
	});
}

/**
 * Report an element-specific error (compatibility wrapper)
 */
export function reportElementError(element: HTMLElement | null, error: unknown, info?: Record<string, unknown>) {
	console.error('[Reported Element Error]', {
		element,
		error,
		info,
		timestamp: new Date().toISOString(),
	});
}

