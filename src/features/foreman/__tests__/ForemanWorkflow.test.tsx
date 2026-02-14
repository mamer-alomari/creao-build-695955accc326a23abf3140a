
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ForemanJobExecution } from "@/features/foreman/ForemanJobExecution";
import { JobStatus } from "@/sdk/database/orm/orm_job";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useNavigate } from "@tanstack/react-router";
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// Mocks
vi.mock("@tanstack/react-query", () => ({
    useQuery: vi.fn(),
    useMutation: vi.fn(),
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock("@tanstack/react-router", () => ({
    useParams: vi.fn(),
    useNavigate: vi.fn(),
    createFileRoute: vi.fn(() => () => null),
}));

describe("ForemanWorkflow", () => {
    const mockNavigate = vi.fn();
    const mockMutate = vi.fn();

    beforeEach(() => {
        (useNavigate as unknown as Mock).mockReturnValue(mockNavigate);
        (useParams as unknown as Mock).mockReturnValue({ jobId: "job-123" });
        (useMutation as unknown as Mock).mockReturnValue({
            mutate: mockMutate,
            isPending: false,
        });
    });

    it("renders 'Start Job' button when status is BOOKED", () => {
        (useQuery as unknown as Mock).mockReturnValue({
            data: {
                id: "job-123",
                status: JobStatus.Booked,
                customer_name: "Alice Smith",
                pickup_address: "123 Main St",
            },
            isLoading: false,
        });

        render(<ForemanJobExecution />);

        expect(screen.getByText("Ready to Start?")).toBeInTheDocument();
        const btn = screen.getByText("Start Route (Notify Customer)");
        expect(btn).toBeInTheDocument();

        fireEvent.click(btn);
        expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({
            status: JobStatus.EnRoute
        }));
    });

    it("renders 'Arrived' button when status is EN_ROUTE", () => {
        (useQuery as unknown as Mock).mockReturnValue({
            data: {
                id: "job-123",
                status: JobStatus.EnRoute, // 6
                customer_name: "Alice Smith",
            },
            isLoading: false,
        });

        render(<ForemanJobExecution />);

        expect(screen.getByText("Driving to Pickup...")).toBeInTheDocument();
        const btn = screen.getByText("Arrived at Location");
        fireEvent.click(btn);
        expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({
            status: JobStatus.Arrived
        }));
    });

    it("shows Equipment Check after Arrival", () => {
        (useQuery as unknown as Mock).mockReturnValue({
            data: {
                id: "job-123",
                status: JobStatus.Arrived, // 7
                customer_name: "Alice Smith",
            },
            isLoading: false,
        });

        render(<ForemanJobExecution />);
        // By default step is "status", but clicking "Continue setup" sets step to "equipment"
        // Wait, current logic:
        // statusConfig.handler -> setStep("equipment")

        const btn = screen.getByText("Continue setup");
        fireEvent.click(btn);

        expect(screen.getByText("2. Equipment Check")).toBeInTheDocument();
        expect(screen.getByText("Confirm Equipment")).toBeInTheDocument();
    });
});
