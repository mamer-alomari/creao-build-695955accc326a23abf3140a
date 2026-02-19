
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ForemanJobExecution } from "@/features/foreman/ForemanJobExecution";
import { JobStatus } from "@/sdk/database/orm/orm_job";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useNavigate } from "@tanstack/react-router";
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// Mocks
vi.mock("@tanstack/react-query", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@tanstack/react-query")>();
    return {
        ...actual,
        useQuery: vi.fn(),
        useMutation: vi.fn(),
        useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
    };
});

vi.mock("@tanstack/react-router", () => ({
    useParams: vi.fn(),
    useNavigate: vi.fn(),
    createFileRoute: vi.fn(() => () => null),
}));

vi.mock("@/sdk/core/auth", () => ({
    useCreaoAuth: vi.fn(() => ({ user: { uid: "test-user" }, companyId: "test-company" })),
}));

vi.mock("@/lib/notifications", () => ({
    notifications: {
        notifyArrival: vi.fn(),
    }
}));

vi.mock("@/lib/firebase", () => ({
    storage: {},
}));

describe("ForemanWorkflow", () => {
    const mockNavigate = vi.fn();
    const mockMutate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
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
                vehicle_checklist: { completed_by: "test" }, // Mock checklist done so it starts directly
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

    it("navigates to Inventory after notifying customer", async () => {
        (useQuery as unknown as Mock).mockReturnValue({
            data: {
                id: "job-123",
                status: JobStatus.Arrived,
                customer_name: "Alice Smith",
            },
            isLoading: false,
        });

        // Mock window.confirm
        const confirmSpy = vi.spyOn(window, 'confirm');
        confirmSpy.mockImplementation(() => true);

        render(<ForemanJobExecution />);

        const btn = screen.getByText("Notify Customer Team is Here");
        fireEvent.click(btn);

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith({ to: "/foreman/jobs/job-123/inventory" });
        });

        confirmSpy.mockRestore();
    });
});
