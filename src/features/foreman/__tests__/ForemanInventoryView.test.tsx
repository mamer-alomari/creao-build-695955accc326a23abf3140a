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

vi.mock("@/hooks/use-google-vision", () => ({
    useAnalyzeRoomImage: () => ({ mutateAsync: vi.fn() }),
    ITEM_CATEGORIES: [
        { value: "other", label: "Other" },
        { value: "furniture", label: "Furniture" },
    ]
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
        expect(screen.getByText("Loading Job Inventory...")).toBeInTheDocument();
    });

    it("renders items from job data", async () => {
        (mockJobORMInstance.getJobById as any).mockResolvedValue([{
            id: "job-123",
            customer_name: "Test Job",
            final_inventory_data: JSON.stringify([
                { id: "i1", name: "Sofa", category: "furniture", quantity: 1 },
                { id: "i2", name: "Table", category: "furniture", quantity: 1 }
            ])
        }]);

        renderWithClient(<ForemanInventoryView />);

        await waitFor(() => {
            expect(screen.getByText("Sofa")).toBeInTheDocument();
            expect(screen.getByText("Table")).toBeInTheDocument();
        });
    });

    it("opens dialog for manual entry", async () => {
        (mockJobORMInstance.getJobById as any).mockResolvedValue([{
            id: "job-123",
            customer_name: "Test Job",
            final_inventory_data: "[]"
        }]);

        renderWithClient(<ForemanInventoryView />);

        await waitFor(() => expect(screen.getByText(/No items scanned yet/)).toBeInTheDocument());

        // Click Manual Entry button
        const addButton = screen.getByText("Manual Entry");
        fireEvent.click(addButton);

        // Dialog should appear with item name input
        await waitFor(() => {
            expect(screen.getByText("Add Item")).toBeInTheDocument();
            expect(screen.getByPlaceholderText("e.g., Sofa, Box of Books")).toBeInTheDocument();
        });
    });

    it("saves and navigates on complete", async () => {
        (mockJobORMInstance.getJobById as any).mockResolvedValue([{
            id: "job-123",
            customer_name: "Test Job",
            final_inventory_data: JSON.stringify([{ id: "i1", name: "Chair", category: "other", quantity: 1 }])
        }]);
        (mockJobORMInstance.setJobById as any).mockResolvedValue([]);

        renderWithClient(<ForemanInventoryView />);

        await waitFor(() => expect(screen.getByText("Chair")).toBeInTheDocument());

        const completeBtn = screen.getByText(/All Items Scanned/i);
        fireEvent.click(completeBtn);

        await waitFor(() => {
            expect(mockJobORMInstance.setJobById).toHaveBeenCalledWith("job-123", expect.objectContaining({
                final_inventory_data: expect.stringContaining("Chair")
            }));
        });
    });
});
