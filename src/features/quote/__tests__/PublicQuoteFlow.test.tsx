
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GetQuoteView } from "@/routes/get-quote";
import "@testing-library/jest-dom";

// Mock Router
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
    useNavigate: vi.fn(() => mockNavigate),
    createFileRoute: vi.fn(() => () => null),
    Link: ({ children }: any) => <div>{children}</div>
}));

// Mock ORM
const mockInsertQuote = vi.fn().mockResolvedValue({ id: "quote-123" });
vi.mock("@/sdk/database/orm/orm_quote", () => ({
    QuoteORM: {
        getInstance: () => ({
            insertQuote: mockInsertQuote
        })
    }
}));

// Mock Query
vi.mock("@tanstack/react-query", () => ({
    useQueryClient: vi.fn(() => ({
        invalidateQueries: vi.fn()
    }))
}));

// Mock Room Inventory to avoid complex logic
vi.mock("@/components/room-inventory", () => ({
    RoomInventoryManager: ({ onInventoryChange }: any) => (
        <div data-testid="inventory-manager">
            <button onClick={() => onInventoryChange([{ roomName: "Test Room", items: [] }])}>
                Add Mock Inventory
            </button>
        </div>
    )
}));

describe("PublicQuoteFlow Integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(window, 'alert').mockImplementation(() => { });
    });

    it("completes full quote flow", async () => {
        const user = userEvent.setup();
        render(<GetQuoteView />);

        // Step 1: Logistics
        // Use placeholders or labels as appropriate. Assuming standard inputs.
        const pickup = screen.getByLabelText(/Pickup Address/i);
        await user.type(pickup, "123 Start");

        const dropoff = screen.getByLabelText(/Dropoff Address/i);
        await user.type(dropoff, "456 End");

        // Date Selection
        const dateBtn = screen.getByText("Pick a date");
        await user.click(dateBtn);
        // Select a date from the calendar (assuming "15" is visible in current month view)
        const dayBtn = await screen.findByText("15");
        await user.click(dayBtn);

        const nextBtn = screen.getByText("Next Step");
        await waitFor(() => expect(nextBtn).toBeEnabled());
        await user.click(nextBtn);

        // Step 2: Inventory
        await waitFor(() => expect(screen.getByTestId("inventory-manager")).toBeInTheDocument());

        const addInvBtn = screen.getByText("Add Mock Inventory");
        await user.click(addInvBtn);

        // Wait for inventory state to update (if any async)
        const step2Next = screen.getByText("Next Step");
        await user.click(step2Next);

        // Step 3: Contact & Review
        await waitFor(() => expect(screen.getByText("Review Your Quote")).toBeInTheDocument());

        const name = screen.getByLabelText(/Full Name/i);
        await user.type(name, "John Doe");

        const email = screen.getByLabelText(/Email Address/i);
        await user.type(email, "john@example.com");

        const phone = screen.getByLabelText(/Phone Number/i);
        await user.type(phone, "555-0123");

        const submitBtn = screen.getByText("Send Request & Book");
        await waitFor(() => expect(submitBtn).toBeEnabled());
        await user.click(submitBtn);

        // Verify success step
        await expect(screen.findByText("Booking Request Received!")).resolves.toBeInTheDocument();

        expect(mockInsertQuote).toHaveBeenCalledWith(expect.objectContaining({
            pickup_address: "123 Start"
        }));
    }, 15000);
});
