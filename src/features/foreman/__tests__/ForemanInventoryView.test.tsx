import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForemanInventoryView } from "../ForemanInventoryView";
import { JobORM, JobStatus } from "@/sdk/database/orm/orm_job";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
    JobStatus: { Arrived: 7 }
}));

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
    useParams: () => ({ jobId: "job-123" }),
    useNavigate: () => mockNavigate
}));

vi.mock("@/sdk/core/auth", () => ({
    useCreaoAuth: () => ({ user: { uid: "user-123" } })
}));

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

describe("ForemanInventoryView", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders loading initially", () => {
        (mockJobORMInstance.getJobById as any).mockImplementation(() => new Promise(() => { })); // Hang
        renderWithClient(<ForemanInventoryView />);
        expect(screen.getByText("Loading Inventory...")).toBeInTheDocument();
    });

    it("renders items from job data", async () => {
        (mockJobORMInstance.getJobById as any).mockResolvedValue([{
            id: "job-123",
            customer_name: "Test Job",
            final_inventory_data: JSON.stringify(["Sofa", "Table"])
        }]);

        renderWithClient(<ForemanInventoryView />);

        await waitFor(() => {
            expect(screen.getByText("Sofa")).toBeInTheDocument();
            expect(screen.getByText("Table")).toBeInTheDocument();
        });
    });

    it("allows adding items manually", async () => {
        (mockJobORMInstance.getJobById as any).mockResolvedValue([{
            id: "job-123",
            customer_name: "Test Job",
            final_inventory_data: "[]"
        }]);

        renderWithClient(<ForemanInventoryView />);

        await waitFor(() => expect(screen.getByText("No items scanned yet. Use camera or add manually.")).toBeInTheDocument());

        const addButton = screen.getByText("Add Manual");
        fireEvent.click(addButton);

        await waitFor(() => {
            expect(screen.getByText("Item #1")).toBeInTheDocument();
        });
    });

    it("saves and navigates on complete", async () => {
        (mockJobORMInstance.getJobById as any).mockResolvedValue([{
            id: "job-123",
            customer_name: "Test Job",
            final_inventory_data: JSON.stringify(["Chair"])
        }]);
        (mockJobORMInstance.setJobById as any).mockResolvedValue([]);

        renderWithClient(<ForemanInventoryView />);

        await waitFor(() => expect(screen.getByText("Chair")).toBeInTheDocument());

        const completeBtn = screen.getByText(/Complete & Continue to Quote/i);
        fireEvent.click(completeBtn);

        await waitFor(() => {
            expect(mockJobORMInstance.setJobById).toHaveBeenCalledWith("job-123", expect.objectContaining({
                final_inventory_data: expect.stringContaining("Chair")
            }));
            expect(mockNavigate).toHaveBeenCalledWith({ to: "/foreman/jobs/job-123/execute" });
        });
    });
});
