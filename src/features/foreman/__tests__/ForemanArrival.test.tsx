
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ForemanJobExecution } from "../ForemanJobExecution";
import { JobORM, JobStatus } from "@/sdk/database/orm/orm_job";
import { notifications } from "@/lib/notifications";

// Mock Dependencies
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

vi.mock("@/lib/notifications", () => ({
    notifications: {
        notifyArrival: vi.fn()
    }
}));

vi.mock("@tanstack/react-router", () => ({
    useParams: () => ({ jobId: "job-123" }),
    useNavigate: () => vi.fn()
}));

vi.mock("@/sdk/core/auth", () => ({
    useCreaoAuth: () => ({ user: { uid: "user-1" }, companyId: "company-1" })
}));

vi.mock("sonner", () => ({
    toast: vi.fn()
}));

// Mock window.confirm
global.confirm = vi.fn(() => true);

const mockJob = {
    id: "job-123",
    customer_name: "Test Customer",
    status: JobStatus.Arrived,
    pickup_address: "123 Test St",
    vehicle_checklist: { engine_start: true } // Checklist done
};

const renderWithClient = (ui: React.ReactElement) => {
    const client = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });
    return render(
        <QueryClientProvider client={client}>
            {ui}
        </QueryClientProvider>
    );
};

describe("ForemanJobExecution - Arrival Flow", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (mockJobORMInstance.getJobById as any).mockResolvedValue([mockJob]);
        (mockJobORMInstance.setJobById as any).mockResolvedValue([mockJob]);
    });

    it("shows Notify Customer button when Arrived", async () => {
        renderWithClient(<ForemanJobExecution />);

        await waitFor(() => {
            expect(screen.getByText("Notify Customer Team is Here")).toBeInTheDocument();
        });
    });

    it("notifies customer and transitions to inventory on click", async () => {
        renderWithClient(<ForemanJobExecution />);

        await waitFor(() => {
            expect(screen.getByText("Notify Customer Team is Here")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText("Notify Customer Team is Here"));

        await waitFor(() => {
            expect(notifications.notifyArrival).toHaveBeenCalledWith(
                "Test Customer",
                "555-0000",
                "customer@example.com"
            );
        });

        // Should transition to Inventory step (Scan Items)
        // We look for text unique to the inventory step
        await waitFor(() => {
            expect(screen.getByText(/Walkthrough & Scan/i)).toBeInTheDocument();
        });
    });
});
