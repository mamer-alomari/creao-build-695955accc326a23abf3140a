
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReportIncidentView } from "@/features/worker/components/ReportIncidentView";
import { IncidentORM } from "@/sdk/database/orm/orm_incident";
import { useCreaoAuth } from "@/sdk/core/auth";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// Mocks
vi.mock("@/sdk/database/orm/orm_incident", () => ({
    IncidentORM: {
        getInstance: vi.fn(() => ({
            createIncident: vi.fn(),
        }))
    }
}));

vi.mock("@/sdk/core/auth", () => ({
    useCreaoAuth: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
    useNavigate: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
    useMutation: vi.fn(),
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
        render(<ReportIncidentView />);

        // Fill Description
        const descInput = screen.getByPlaceholderText("Describe what happened...");
        fireEvent.change(descInput, { target: { value: "Flat tire on truck 2" } });

        // Submit
        const submitBtn = screen.getByText("Submit Report");
        expect(submitBtn).not.toBeDisabled();

        fireEvent.click(submitBtn);

        expect(mockMutate).toHaveBeenCalled();
    });
});
