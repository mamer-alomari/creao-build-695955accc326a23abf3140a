
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReportIncidentView } from "@/features/worker/components/ReportIncidentView";
import { IncidentORM } from "@/sdk/database/orm/orm_incident";
import { useCreaoAuth } from "@/sdk/core/auth";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// Mock dependencies
vi.mock("@tanstack/react-router", () => ({
    useNavigate: vi.fn(),
    createFileRoute: vi.fn(() => () => null)
}));

vi.mock("@tanstack/react-query", () => ({
    useMutation: vi.fn(),
    useQueryClient: vi.fn(() => ({
        invalidateQueries: vi.fn()
    }))
}));

vi.mock("@/sdk/database/orm/orm_incident", () => ({
    IncidentORM: {
        getInstance: vi.fn()
    }
}));

vi.mock("@/sdk/core/auth", () => ({
    useCreaoAuth: vi.fn()
}));

describe("ReportIncidentView", () => {
    const mockNavigate = vi.fn();
    const mockCreateIncident = vi.fn();
    const mockMutate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useNavigate as unknown as Mock).mockReturnValue(mockNavigate);
        (useCreaoAuth as unknown as Mock).mockReturnValue({
            user: { uid: "worker-1" },
            companyId: "comp-1"
        });
        (IncidentORM.getInstance as unknown as Mock).mockReturnValue({
            createIncident: mockCreateIncident
        });
        (useMutation as unknown as Mock).mockReturnValue({
            mutate: mockMutate,
            isPending: false
        });
    });

    it("renders form", () => {
        render(<ReportIncidentView />);
        expect(screen.getByText("Report Incident")).toBeInTheDocument();
        expect(screen.getByText("Safety First")).toBeInTheDocument();
    });

    it("submits the form", async () => {
        const user = userEvent.setup();
        render(<ReportIncidentView />);

        // Fill Description
        const descInput = screen.getByPlaceholderText("Describe what happened...");
        await user.type(descInput, "Flat tire on truck 2");

        // Submit
        const submitBtn = screen.getByText("Submit Report");
        expect(submitBtn).not.toBeDisabled();

        await user.click(submitBtn);

        expect(mockMutate).toHaveBeenCalled();
    });
});
