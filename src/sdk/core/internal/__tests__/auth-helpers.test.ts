import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock storage to capture the callback
const { mocks } = vi.hoisted(() => ({
    mocks: {
        authStateCallback: undefined as ((user: any) => void) | undefined
    }
}));

// Mock Firebase Auth
vi.mock("firebase/auth", () => ({
    getAuth: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn((auth, cb) => {
        mocks.authStateCallback = cb;
        return () => { };
    }),
}));

// Mock Firestore
vi.mock("firebase/firestore", () => ({
    doc: vi.fn(),
    getDoc: vi.fn(() => Promise.resolve({
        exists: () => true,
        data: () => ({ role: 'customer' })
    })),
    setDoc: vi.fn(),
    getFirestore: vi.fn(),
}));

// Mock Firebase Config
vi.mock("@/lib/firebase", () => ({
    auth: {},
    db: {}
}));

// Import module AFTER mocks
import { isAuthenticatedSync, hasNoToken, UserRole } from "@/sdk/core/auth";

describe('Auth Helpers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('UserRole has correct values', () => {
        expect(UserRole.Customer).toBe('customer');
        expect(UserRole.Worker).toBe('worker');
    });

    it('isAuthenticatedSync updates correctly', async () => {
        // Trigger login
        if (mocks.authStateCallback) {
            await mocks.authStateCallback({
                uid: '123',
                email: 'test@example.com',
                getIdToken: () => Promise.resolve('token-123')
            });
        }

        expect(isAuthenticatedSync()).toBe(true);

        // Trigger logout
        if (mocks.authStateCallback) {
            await mocks.authStateCallback(null);
        }
        expect(isAuthenticatedSync()).toBe(false);
    });

    it('hasNoToken updates correctly', async () => {
        // Login
        if (mocks.authStateCallback) {
            await mocks.authStateCallback({
                uid: '123',
                getIdToken: () => Promise.resolve('token-123')
            });
        }
        expect(hasNoToken()).toBe(false);

        // Logout
        if (mocks.authStateCallback) {
            await mocks.authStateCallback(null);
        }
        expect(hasNoToken()).toBe(true);
    });
});
