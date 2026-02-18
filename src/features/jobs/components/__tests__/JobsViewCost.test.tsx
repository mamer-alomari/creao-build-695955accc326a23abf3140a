
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { JobsView } from "../JobsView";
import { JobStatus } from "@/sdk/database/orm/orm_job";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";

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

// Mock dependencies
vi.mock("@/hooks/use-distance-matrix", () => ({
    useDistanceMatrix: () => ({
        calculateDistance: vi.fn().mockResolvedValue({
            distance: { text: "10 miles", value: 16093.4 },
            duration: { text: "20 mins", value: 1200 }
        }),
    })
}));

vi.mock("@/components/room-inventory", () => ({
    RoomInventoryManager: () => <div data-testid="room-inventory-manager">Inventory Manager Mock</div>
}));

// Mock JobORM
const mockInsertJob = vi.fn();
vi.mock("@/sdk/database/orm/orm_job", async () => {
    const actual = await vi.importActual("@/sdk/database/orm/orm_job");
    return {
        ...actual,
        JobORM: {
            getInstance: () => ({
                insertJob: mockInsertJob,
                setJobById: vi.fn(),
                deleteJobByIDs: vi.fn(),
            }),
        },
    };
});

describe("JobsView Quote Cost Flow", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("allows manual editing of estimated cost in review step", async () => {
        const user = userEvent.setup();
        render(
            <Wrapper>
                <JobsView
                    jobs={[]}
                    workers={[]}
                    vehicles={[]}
                    equipment={[]}
                    companyId="test-company"
                />
            </Wrapper>
        );

        // 1. Open Wizard
        await user.click(screen.getByText("Create Quote with AI Inventory"));

        // 2. Fill Step 1
        await user.type(screen.getByLabelText(/Customer Name/i), "Test Customer");
        await user.type(screen.getByLabelText(/Pickup Address/i), "A");
        await user.type(screen.getByLabelText(/Dropoff Address/i), "B");
        await user.click(screen.getByText("Next: Add Inventory"));

        // 3. Next -> Review (Step 2 -> 3)
        await user.click(screen.getByText("Next: Review Quote"));

        // 4. Check initial cost (calculated from mock: $200 + 10 miles * $2 = $220)
        // Note: The input value
        const costInput = screen.getByRole("spinbutton"); // type="number"
        expect(costInput).toHaveValue(220);

        // 5. Manually change cost to 300
        await user.clear(costInput);
        await user.type(costInput, "300");
        expect(costInput).toHaveValue(300);

        // 6. Save Quote
        await user.click(screen.getByText("Save Quote"));

        // 7. Verify mutation called with manual cost
        await waitFor(() => {
            expect(mockInsertJob).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({
                    customer_name: "Test Customer",
                    estimated_cost: 300
                })
            ]));
        });
    });
});
