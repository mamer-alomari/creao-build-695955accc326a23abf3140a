import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { JobsView } from "../JobsView";
import { JobStatus, type JobModel } from "@/sdk/database/orm/orm_job";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";

// Mock dependencies
vi.mock("@/hooks/use-distance-matrix", () => ({
    useDistanceMatrix: () => ({
        calculateDistance: vi.fn(),
        isLoading: false,
        error: null,
    }),
}));

vi.mock("@/hooks/use-google-vision", () => ({
    useAnalyzeRoomImage: () => ({
        mutateAsync: vi.fn(),
    }),
    fileToDataUrl: vi.fn(),
    ROOM_TYPES: [
        { value: "living_room", label: "Living Room" },
    ],
    ITEM_CATEGORIES: [
        { value: "furniture", label: "Furniture" },
    ],
}));

// Mock React Query
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const mockInventory = [
    {
        roomName: "Living Room",
        roomType: "living_room",
        items: [
            {
                id: "item-1",
                name: "Sofa",
                quantity: 1,
                category: "furniture",
                estimatedSize: "large",
            },
        ],
        totalItems: 1,
    }
];

const mockJobWithInventory: JobModel = {
    id: "job-inv-1",
    customer_name: "Inventory User",
    pickup_address: "123 Inventory St",
    dropoff_address: "456 Storage Ln",
    scheduled_date: (Date.now() / 1000).toString(),
    status: JobStatus.Quote,
    estimated_cost: 600,
    company_id: "company-1",
    data_creator: "user-1",
    data_updater: "user-1",
    create_time: "1234567890",
    update_time: "1234567890",
    inventory_data: JSON.stringify(mockInventory),
};

describe("JobsView Inventory Persistence", () => {
    it("displays inventory section in edit dialog when inventory_data is present", async () => {
        render(
            <Wrapper>
                <JobsView
                    jobs={[mockJobWithInventory]}
                    workers={[]}
                    vehicles={[]}
                    equipment={[]}
                    companyId="company-1"
                />
            </Wrapper>
        );

        // Click on the job row to open dialog
        const jobRow = screen.getByText("Inventory User");
        fireEvent.click(jobRow);

        // Wait for dialog to open and check for Inventory section
        expect(await screen.findByText("Inventory & Images")).toBeInTheDocument();

        // Check if room name and item are displayed
        expect(screen.getByText("Living Room")).toBeInTheDocument();
        expect(screen.getByText("Sofa")).toBeInTheDocument();
    });

    it("does not display inventory section when inventory_data is missing", async () => {
        const jobWithoutInventory: JobModel = {
            ...mockJobWithInventory,
            id: "job-no-inv",
            customer_name: "No Inventory User",
            inventory_data: undefined,
        };

        render(
            <Wrapper>
                <JobsView
                    jobs={[jobWithoutInventory]}
                    workers={[]}
                    vehicles={[]}
                    equipment={[]}
                    companyId="company-1"
                />
            </Wrapper>
        );

        const jobRow = screen.getByText("No Inventory User");
        fireEvent.click(jobRow);

        // Check that Inventory section header is NOT present
        expect(screen.queryByText("Inventory & Images")).not.toBeInTheDocument();
    });
});
