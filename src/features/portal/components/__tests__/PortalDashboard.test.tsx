import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PortalDashboard } from "../PortalDashboard";
import { JobStatus } from "@/sdk/database/orm/orm_job";
import "@testing-library/jest-dom";

// Mock dependencies
vi.mock("@tanstack/react-router", () => ({
    useNavigate: vi.fn(),
    Link: ({ children }: any) => <div>{children}</div>
}));

const mockUser = {
    uid: "customer-1",
    email: "customer@example.com",
    role: "customer"
};

const mockQuotes = [
    {
        id: "quote-1",
        customer_id: "customer-1",
        pickup_address: "123 Start",
        dropoff_address: "456 End",
        move_date: "2023-12-25",
        create_time: "2023-12-01T10:00:00Z",
        status: "PENDING",
        estimated_price_min: 100,
        estimated_price_max: 150,
        inventory_items: [] // Simplified for test
    }
];

const mockJobs = [
    {
        id: "job-1",
        customer_id: "customer-1",
        pickup_address: "123 Start",
        dropoff_address: "456 End",
        scheduled_date: "2023-12-26",
        status: JobStatus.Booked,
        company_id: "company-1"
    }
];

// Mock Hooks
const mockMutate = vi.fn();
vi.mock("@tanstack/react-query", () => ({
    useQueryClient: vi.fn(() => ({
        invalidateQueries: vi.fn()
    })),
    useQuery: vi.fn(({ queryKey }) => {
        if (queryKey[0] === "customer-quotes") {
            return { data: mockQuotes, isLoading: false };
        }
        if (queryKey[0] === "customer-jobs") {
            return { data: mockJobs, isLoading: false };
        }
        return { data: [], isLoading: false };
    }),
    useMutation: vi.fn(() => ({
        mutate: mockMutate,
        isPending: false
    }))
}));

vi.mock("@/sdk/core/auth", () => ({
    useCreaoAuth: vi.fn(() => ({ user: mockUser }))
}));

// Mock ORMs 
vi.mock("@/sdk/database/orm/orm_quote", () => ({
    QuoteORM: {
        getInstance: () => ({
            getQuotesByCustomerId: vi.fn(),
            updateStatus: vi.fn()
        })
    }
}));

vi.mock("@/sdk/database/orm/orm_job", () => ({
    JobORM: {
        getInstance: () => ({
            getJobsByCustomerId: vi.fn(),
            insertJob: vi.fn()
        })
    },
    JobStatus: {
        Unspecified: 0,
        Quote: 1,
        Booked: 2,
        InProgress: 3,
        EnRoute: 4,
        Arrived: 5,
        Loading: 6,
        onWayToDropoff: 7,
        Unloading: 8,
        Completed: 9,
        Canceled: 10,
        // Reverse mappings
        0: "Unspecified",
        1: "Quote",
        2: "Booked",
        3: "InProgress",
        4: "EnRoute",
        5: "Arrived",
        6: "Loading",
        7: "onWayToDropoff",
        8: "Unloading",
        9: "Completed",
        10: "Canceled"
    }
}));

describe("PortalDashboard", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders quotes tab by default", () => {
        render(<PortalDashboard />);
        expect(screen.getByText("My Quotes (1)")).toBeInTheDocument();
        expect(screen.getByText("Active Jobs (1)")).toBeInTheDocument();

        // Check for quote details
        expect(screen.getByText("123 Start")).toBeInTheDocument();
        expect(screen.getByText("$100 - $150")).toBeInTheDocument();
    });

    it("renders book button for pending quotes", () => {
        render(<PortalDashboard />);
        const bookBtn = screen.getByText("Book Now");
        expect(bookBtn).toBeInTheDocument();
    });

    it("calls book mutation when clicked", async () => {
        const user = userEvent.setup();
        render(<PortalDashboard />);
        const bookBtn = screen.getByText("Book Now");
        await user.click(bookBtn);
        expect(mockMutate).toHaveBeenCalledWith(mockQuotes[0]);
    });

    it("switches to jobs tab", async () => {
        const user = userEvent.setup();
        render(<PortalDashboard />);

        const jobsTab = screen.getByText("Active Jobs (1)");
        await user.click(jobsTab);

        // Job details should be visible
        // There are two "Booked" texts: one in Badge, one in Status Details.
        // We expect at least one to appear.
        const bookedElements = await screen.findAllByText("Booked");
        expect(bookedElements.length).toBeGreaterThan(0);

        // Check for Job ID partial text
        expect(screen.getByText(/Job ID: job-1/)).toBeInTheDocument();
    });

    it("shows estimated cost on job card", async () => {
        const user = userEvent.setup();
        render(<PortalDashboard />);
        const jobsTab = screen.getByText("Active Jobs (1)");
        await user.click(jobsTab);
        expect(screen.getByText("Estimated Cost")).toBeInTheDocument();
    });

    it("shows View Timeline button on job cards", async () => {
        const user = userEvent.setup();
        render(<PortalDashboard />);
        const jobsTab = screen.getByText("Active Jobs (1)");
        await user.click(jobsTab);
        expect(screen.getByText("View Timeline")).toBeInTheDocument();
    });

    it("toggles timeline visibility on click", async () => {
        const user = userEvent.setup();
        render(<PortalDashboard />);
        const jobsTab = screen.getByText("Active Jobs (1)");
        await user.click(jobsTab);

        // Click View Timeline
        const timelineBtn = screen.getByText("View Timeline");
        await user.click(timelineBtn);

        // Timeline steps should appear
        expect(screen.getByText("Quote")).toBeInTheDocument();
        expect(screen.getByText("En Route")).toBeInTheDocument();

        // Button text should now say Hide
        expect(screen.getByText("Hide Timeline")).toBeInTheDocument();

        // Toggle back
        await user.click(screen.getByText("Hide Timeline"));
        expect(screen.getByText("View Timeline")).toBeInTheDocument();
    });
});
