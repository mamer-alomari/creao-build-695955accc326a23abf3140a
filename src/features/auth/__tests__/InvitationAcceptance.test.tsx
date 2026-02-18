import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
// Import Route to get the component. 
// Since InviteView is not exported, we need to export it or access it via Route.component
// If we can't easily access it, we might need to modify src/routes/invite.tsx to export it.
// For now, let's assume we modified invite.tsx or use a workaround.
// Ideally, we should export the component for testing. 
// I'll assume I can modify invite.tsx to export `InviteView` or `InvitationAcceptanceView`.
// But first, let's just try importing from the route file if it was exported.
// Since it's not, I'll modify the file *first* in a separate step or just assume I can access Route.component.
// Accessing Route.component is a bit tricky with Typescript types if not exported.
// Plan: I will modify invite.tsx to export the component as `InviteViewComponent` to make this clean.

import { Route } from "@/routes/invite";
import "@testing-library/jest-dom";

// Mock Dependencies
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
    createFileRoute: () => (config: any) => config, // Return config so we can access component
    useNavigate: vi.fn(() => mockNavigate),
    useSearch: vi.fn(() => ({ token: "valid-token" })),
}));

// Mock Firebase
const { mockCreateUser } = vi.hoisted(() => ({
    mockCreateUser: vi.fn(() => Promise.resolve({ user: { uid: "new-user-123" } }))
}));

vi.mock("firebase/auth", () => ({
    getAuth: vi.fn(),
    createUserWithEmailAndPassword: mockCreateUser
}));

vi.mock("firebase/firestore", () => ({
    doc: vi.fn(),
    setDoc: vi.fn(),
    getFirestore: vi.fn()
}));

vi.mock("@/lib/firebase", () => ({
    auth: {},
    db: {}
}));

// Mock ORM
const mockGetInvitation = vi.fn();
const mockAcceptInvitation = vi.fn();
vi.mock("@/sdk/database/orm/orm_invitation", () => ({
    InvitationORM: {
        getInstance: () => ({
            getInvitationByToken: mockGetInvitation,
            acceptInvitation: mockAcceptInvitation
        })
    }
}));

describe("Invitation Acceptance", () => {
    const InviteComponent = (Route as any).component;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("shows loading initially", () => {
        // Mock pending promise to keep loading state
        mockGetInvitation.mockReturnValue(new Promise(() => { }));
        render(<InviteComponent />);
        // Look for loader or nothing specific (requires inspecting implementation detail of loader)
        // Implementation uses <Loader2> which usually has role="img" or we can check container val
        // The InviteView implementation: return <div class="..."><Loader2... /></div>
        // Just verify it doesn't show error or form yet
        expect(screen.queryByText("Join Swift Movers")).not.toBeInTheDocument();
    });

    it("displays error for invalid token", async () => {
        mockGetInvitation.mockResolvedValue(null);
        render(<InviteComponent />);
        await waitFor(() => {
            expect(screen.getByText("Invitation not found. It may have expired or been revoked.")).toBeInTheDocument();
        });
    });

    it("displays form for valid token", async () => {
        mockGetInvitation.mockResolvedValue({
            email: "worker@example.com",
            role: "worker",
            company_id: "company-1",
            status: "pending",
            expires_at: new Date(Date.now() + 86400000).toISOString() // Tomorrow
        });

        render(<InviteComponent />);

        await waitFor(() => {
            expect(screen.getByText("Join Swift Movers")).toBeInTheDocument();
        });
        expect(screen.getByDisplayValue("worker@example.com")).toBeInTheDocument();
    });

    it("submits form and creates account", async () => {
        mockGetInvitation.mockResolvedValue({
            email: "worker@example.com",
            role: "worker",
            company_id: "company-1",
            status: "pending",
            expires_at: new Date(Date.now() + 86400000).toISOString()
        });

        render(<InviteComponent />);
        await waitFor(() => screen.getByLabelText("Set Password"));

        fireEvent.change(screen.getByLabelText("Set Password"), { target: { value: "password123" } });
        fireEvent.change(screen.getByLabelText("Confirm Password"), { target: { value: "password123" } });

        const submitBtn = screen.getByText("Create Account");
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(mockCreateUser).toHaveBeenCalledWith(expect.anything(), "worker@example.com", "password123");
            expect(mockAcceptInvitation).toHaveBeenCalledWith("valid-token");
            expect(mockNavigate).toHaveBeenCalledWith({ to: "/worker" });
        });
    });
});
