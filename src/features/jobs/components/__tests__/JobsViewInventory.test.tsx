import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
        const user = userEvent.setup();
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

        // Job is Quote status — switch to Quotes tab first
        await user.click(screen.getByRole("tab", { name: /Quotes/i }));

        // Wait for job row then click to open dialog
        await waitFor(() => expect(screen.getByText("Inventory User")).toBeInTheDocument());
        await user.click(screen.getByText("Inventory User"));

        // Wait for dialog to open and check for Inventory section
        expect(await screen.findByText("Inventory & Images")).toBeInTheDocument();

        // Check if room name and item are displayed
        // We might have multiple "Living Room" texts (one in list, one in dialog)
        // so we scope to the dialog or use getAllByText
        expect(screen.getAllByText("Living Room")[0]).toBeInTheDocument();
        expect(screen.getAllByText("Sofa")[0]).toBeInTheDocument();
    });

    it("does not display inventory section when inventory_data is missing", async () => {
        const jobWithoutInventory: JobModel = {
            ...mockJobWithInventory,
            id: "job-no-inv",
            customer_name: "No Inventory User",
            inventory_data: undefined,
        };

        const user = userEvent.setup();
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

        // Job is Quote status — switch to Quotes tab first
        await user.click(screen.getByRole("tab", { name: /Quotes/i }));

        await waitFor(() => expect(screen.getByText("No Inventory User")).toBeInTheDocument());
        await user.click(screen.getByText("No Inventory User"));

        // Check that Inventory section header is NOT present
        expect(screen.queryByText("Inventory & Images")).not.toBeInTheDocument();
    });
});
