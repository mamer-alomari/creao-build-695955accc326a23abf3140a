/**
 * Authentication Integration Utilities with Firebase
 */

import { create } from "zustand";
import { auth, db } from "@/lib/firebase";
import {
	onAuthStateChanged,
	signOut,
	type User,
	type NextOrObserver
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

// Enum definition moved here to avoid circular dependencies
export enum UserRole {
	Unspecified = "unspecified",
	Customer = "customer",
	Worker = "worker",
	Foreman = "foreman",
	Manager = "manager",
	Admin = "admin",
}

interface AuthState {
	user: User | null;
	token: string | null;
	status: "authenticated" | "unauthenticated" | "loading";
	role: UserRole;
	companyId: string | null;
}

interface AuthStore extends AuthState {
	// Actions
	setUser: (user: User | null) => void;
	setToken: (token: string | null) => void;
	setRole: (role: UserRole) => void;
	setCompanyId: (companyId: string | null) => void;
	logout: () => Promise<void>;
}

/**
 * Zustand store for authentication state management
 */
const useAuthStore = create<AuthStore>((set) => ({
	user: null,
	token: null,
	status: "loading",
	role: UserRole.Unspecified,
	companyId: null,

	setUser: (user) => set({ user, status: user ? "authenticated" : "unauthenticated" }),
	setToken: (token) => set({ token }),
	setRole: (role) => set({ role }),
	setCompanyId: (companyId) => set({ companyId }),

	logout: async () => {
		await signOut(auth);
		set({ user: null, token: null, status: "unauthenticated", role: UserRole.Unspecified, companyId: null });
	}
}));

// Initialize Auth Listener
onAuthStateChanged(auth, async (user) => {
	const { setUser, setToken, setRole, setCompanyId } = useAuthStore.getState();

	if (user) {
		const token = await user.getIdToken();
		setUser(user);
		setToken(token);

		// Fetch role and companyId from Firestore
		try {
			const userDocRef = doc(db, "users", user.uid);
			const userDoc = await getDoc(userDocRef);

			if (userDoc.exists()) {
				const userData = userDoc.data();
				if (userData.role) {
					// Map string role to Enum if necessary
					const roleStr = userData.role as string;
					let roleEnum = UserRole.Unspecified;

					if (roleStr === 'admin') roleEnum = UserRole.Admin;
					else if (roleStr === 'manager') roleEnum = UserRole.Manager;
					else if (roleStr === 'foreman') roleEnum = UserRole.Foreman;
					else if (roleStr === 'worker') roleEnum = UserRole.Worker;
					else if (roleStr === 'customer') roleEnum = UserRole.Customer;
					else if (Object.values(UserRole).includes(roleStr as UserRole)) roleEnum = roleStr as UserRole;

					setRole(roleEnum);
				}
				if (userData.companyId) {
					setCompanyId(userData.companyId);
				}
			} else {
				// Create user doc with default role if it doesn't exist
				await setDoc(userDocRef, {
					email: user.email,
					role: UserRole.Unspecified, // Default to Unspecified
					createdAt: new Date().toISOString()
				});
				// No companyId for new users until they onboard
			}
		} catch (error) {
			console.error("Error fetching user role:", error);
		}
	} else {
		setUser(null);
		setToken(null);
		setRole(UserRole.Unspecified);
		setCompanyId(null);
	}
});

/**
 * React hook for using authentication state
 */
export function useCreaoAuth() {
	const store = useAuthStore();

	return {
		...store,
		isAuthenticated: store.status === "authenticated",
		isLoading: store.status === "loading",
		// Compatibility aliases for existing code
		parentOrigin: null,
		hasInvalidToken: false,
		hasNoToken: store.status === "unauthenticated",
		clearAuth: store.logout,
		refreshAuth: async () => true, // Auto-handled by Firebase
	};
}

/**
 * Get current auth token (async) - mainly for legacy compatibility
 */
export async function getAuthTokenAsync(): Promise<string | null> {
	const user = auth.currentUser;
	if (user) {
		return user.getIdToken();
	}
	return null;
}

/**
 * Check if authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
	return !!auth.currentUser;
}

// Compatibility Functions for auth-integration.ts

export const isAuthenticatedSync = (): boolean => {
	return !!useAuthStore.getState().user;
};

export const getUserId = (): string | null => {
	return useAuthStore.getState().user?.uid || null;
};

export const getAuthToken = (): string | null => {
	return useAuthStore.getState().token;
};

export const getAuthStatus = (): string => {
	return useAuthStore.getState().status;
};

export const getAuthStatusAsync = async (): Promise<string> => {
	return useAuthStore.getState().status;
};

export const hasInvalidToken = (): boolean => {
	return false; // Firebase handles token validity
};

export const hasInvalidTokenAsync = async (): Promise<boolean> => {
	return false;
};

export const hasNoToken = (): boolean => {
	return !useAuthStore.getState().token;
};

export const hasNoTokenAsync = async (): Promise<boolean> => {
	return !useAuthStore.getState().token;
};

export const isAuthenticating = (): boolean => {
	return useAuthStore.getState().status === "loading";
};

export const getAuthState = () => {
	return useAuthStore.getState();
};

export const addAuthStateListener = (callback: (state: any) => void) => {
	return useAuthStore.subscribe(callback);
};

export const clearAuth = async () => {
	await useAuthStore.getState().logout();
};

export const refreshAuth = async () => {
	const user = auth.currentUser;
	if (user) {
		await user.getIdToken(true);
	}
	return true;
};

// Export for backward compatibility if needed
export const initializeAuthIntegration = async () => { };

