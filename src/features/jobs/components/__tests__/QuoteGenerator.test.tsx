
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { JobsView } from "../JobsView";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";

// Mock hooks and constants
vi.mock("@/hooks/use-distance-matrix", () => ({
    useDistanceMatrix: () => ({
        calculateDistance: vi.fn().mockResolvedValue({
            distance: { text: "10 miles", value: 16093.4 },
            duration: { text: "20 mins", value: 1200 }
        }),
        isLoading: false,
        error: null
    })
}));

vi.mock("@/components/room-inventory", () => ({
    RoomInventoryManager: () => <div data-testid="room-inventory-manager">Inventory Manager Mock</div>
}));

vi.mock("@/hooks/use-google-vision", () => ({
    useAnalyzeRoomImage: () => ({
        analyzeImage: vi.fn(),
        isAnalyzing: false,
        error: null
    }),
    ROOM_TYPES: [
        { value: "living_room", label: "Living Room" },
        { value: "bedroom", label: "Bedroom" }
    ],
    ITEM_CATEGORIES: [
        { value: "furniture", label: "Furniture" }
    ]
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

describe("Quote Generator Flow", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders the quote generator button", () => {
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
        expect(screen.getByText("Create Quote with AI Inventory")).toBeInTheDocument();
    });

    it("allows navigating through the quote wizard", async () => {
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

        // 1. Open Dialog
        fireEvent.click(screen.getByText("Create Quote with AI Inventory"));
        expect(screen.getByText("Create Quote with AI-Powered Inventory")).toBeInTheDocument();

        // 2. Fill Step 1 (Details)
        fireEvent.change(screen.getByLabelText(/Customer Name/i), { target: { value: "John Doe" } });
        fireEvent.change(screen.getByLabelText(/Pickup Address/i), { target: { value: "123 Start St" } });
        fireEvent.change(screen.getByLabelText(/Dropoff Address/i), { target: { value: "456 End Ln" } });
        fireEvent.change(screen.getByLabelText(/Preferred Move Date/i), { target: { value: "2026-01-01" } });

        // 3. Next -> Inventory
        fireEvent.click(screen.getByText("Next: Add Inventory"));
        // Wait for next step content
        expect(screen.getByTestId("room-inventory-manager")).toBeInTheDocument();

        // 4. Next -> Review (Triggers Distance Calculation mock)
        fireEvent.click(screen.getByText("Next: Review Quote"));

        // 5. Verify Review Step
        await waitFor(() => {
            expect(screen.getByText("Move Details")).toBeInTheDocument();
            // Check for mocked distance values
            expect(screen.getByText("10 miles")).toBeInTheDocument();
            // Check for cost calculation: Base $200 + Distance (10 miles * $2 = $20) = $220
            expect(screen.getByText("$220.00")).toBeInTheDocument();
        });
    });
});
