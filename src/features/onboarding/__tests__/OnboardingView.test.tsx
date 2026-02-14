
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OnboardingView } from "@/features/onboarding/OnboardingView";
import { CompanyORM } from "@/sdk/database/orm/orm_company";
import { useCreaoAuth, UserRole } from "@/sdk/core/auth";
import { useNavigate } from "@tanstack/react-router";
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// Mocks
vi.mock("@/sdk/database/orm/orm_company", () => ({
    CompanyORM: {
        getInstance: vi.fn(() => ({
            insertCompany: vi.fn(),
        }))
    }
}));

vi.mock("@/sdk/core/auth", () => ({
    useCreaoAuth: vi.fn(),
    UserRole: { Manager: "manager" } // Mock enum if needed, or import real one
}));

vi.mock("@tanstack/react-router", () => ({
    useNavigate: vi.fn(),
}));

// Mock Firebase
vi.mock("@/lib/firebase", () => ({
    db: {}
}));
vi.mock("firebase/firestore", () => ({
    doc: vi.fn(),
    updateDoc: vi.fn(),
}));

describe("OnboardingView", () => {
    const mockNavigate = vi.fn();
    const mockInsertCompany = vi.fn();
    const mockSetCompanyId = vi.fn();
    const mockSetRole = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useNavigate as unknown as Mock).mockReturnValue(mockNavigate);
        (useCreaoAuth as unknown as Mock).mockReturnValue({
            user: { uid: "user-1", email: "test@example.com" },
            setCompanyId: mockSetCompanyId,
            setRole: mockSetRole,
        });
        (CompanyORM.getInstance as unknown as Mock).mockReturnValue({
            insertCompany: mockInsertCompany
        });
    });

    it("renders the company creation form", () => {
        render(<OnboardingView />);
        expect(screen.getByText("Welcome to Swift Movers CRM")).toBeInTheDocument();
        expect(screen.getByLabelText("Company Name")).toBeInTheDocument();
    });

    it("creates company and redirects on success", async () => {
        // Mock success response
        mockInsertCompany.mockResolvedValue([{ id: "company-123", name: "Acme" }]);

        render(<OnboardingView />);

        const input = screen.getByLabelText("Company Name");
        fireEvent.change(input, { target: { value: "Acme Moving" } });

        const btn = screen.getByText("Create Workspace");
        expect(btn).not.toBeDisabled();
        fireEvent.click(btn);

        await waitFor(() => {
            expect(mockInsertCompany).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({ name: "Acme Moving", contact_email: "test@example.com" })
            ]));
        });

        await waitFor(() => {
            expect(mockSetCompanyId).toHaveBeenCalledWith("company-123");
            expect(mockSetRole).toHaveBeenCalledWith("manager"); // UserRole.Manager mocked as "manager"? Actually likely works if imported.
            expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
        });
    });
});
