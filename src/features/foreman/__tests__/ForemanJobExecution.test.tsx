
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForemanJobExecution } from "../ForemanJobExecution";
import { JobORM, JobStatus } from "@/sdk/database/orm/orm_job";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";

// Dependencies
vi.mock("@/sdk/core/auth", () => ({
    useCreaoAuth: () => ({
        companyId: "test-company",
        user: { uid: "user-123" }
    })
}));

const { mockJobORMInstance } = vi.hoisted(() => {
    return {
        mockJobORMInstance: {
            getJobById: vi.fn(),
            setJobById: vi.fn()
        }
    }
});

vi.mock("@/sdk/database/orm/orm_job", () => ({
    JobORM: {
        getInstance: vi.fn(() => mockJobORMInstance)
    },
    JobStatus: {
        Booked: 2,
        EnRoute: 6,
        Arrived: 7,
        Loading: 8,
        onWayToDropoff: 9,
        Unloading: 10
    }
}));

vi.mock("@tanstack/react-router", () => ({
    useParams: vi.fn(() => ({ jobId: "job-123" })),
    useNavigate: vi.fn(() => vi.fn())
}));

// Mock child components that are complex
vi.mock("../components/VehicleChecklistDialog", () => ({
    VehicleChecklistDialog: ({ isOpen, onConfirm }: any) => (
        isOpen ? (
            <div data-testid="checklist-dialog">
                <button onClick={() => onConfirm({ engine_start: true })}>Confirm Checklist</button>
            </div>
        ) : null
    )
}));

const createTestQueryClient = () => new QueryClient({
    defaultOptions: { queries: { retry: false } },
});

const renderWithClient = (ui: React.ReactNode) => {
    const client = createTestQueryClient();
    return render(
        <QueryClientProvider client={client}>
            {ui}
        </QueryClientProvider>
    );
};

describe("ForemanJobExecution", () => {
    const mockJob = {
        id: "job-123",
        status: JobStatus.Booked,
        customer_name: "Test Customer",
        pickup_address: "123 Main St",
        vehicle_checklist: undefined // Not done yet
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (mockJobORMInstance.getJobById as any).mockResolvedValue([mockJob]);
        (mockJobORMInstance.setJobById as any).mockResolvedValue([mockJob]);
    });

    it("triggers checklist when starting job without existing checklist", async () => {
        renderWithClient(<ForemanJobExecution />);

        await waitFor(() => expect(screen.getByText("Start Route (Notify Customer)")).toBeInTheDocument());

        fireEvent.click(screen.getByText("Start Route (Notify Customer)"));

        // Should show checklist
        await waitFor(() => expect(screen.getByTestId("checklist-dialog")).toBeInTheDocument());

        // Confirming checklist should triggers job update
        fireEvent.click(screen.getByText("Confirm Checklist"));

        await waitFor(() => {
            expect(mockJobORMInstance.setJobById).toHaveBeenCalledWith(
                "job-123",
                expect.objectContaining({ vehicle_checklist: expect.objectContaining({ engine_start: true }) })
            );
        });

        // Also expect status update to EnRoute (triggered by onSuccess)
        await waitFor(() => {
            expect(mockJobORMInstance.setJobById).toHaveBeenCalledWith(
                "job-123",
                expect.objectContaining({ status: JobStatus.EnRoute })
            );
        });
    });

    it("skips checklist if already present", async () => {
        const jobWithChecklist = { ...mockJob, vehicle_checklist: { engine_start: true } };
        (mockJobORMInstance.getJobById as any).mockResolvedValue([jobWithChecklist]);

        renderWithClient(<ForemanJobExecution />);

        await waitFor(() => expect(screen.getByText("Start Route (Notify Customer)")).toBeInTheDocument());

        fireEvent.click(screen.getByText("Start Route (Notify Customer)"));

        // Should NOT show checklist, should go straight to status update
        await waitFor(() => {
            expect(mockJobORMInstance.setJobById).toHaveBeenCalledWith(
                "job-123",
                expect.objectContaining({ status: JobStatus.EnRoute })
            );
        });

        expect(screen.queryByTestId("checklist-dialog")).not.toBeInTheDocument();
    });
});
