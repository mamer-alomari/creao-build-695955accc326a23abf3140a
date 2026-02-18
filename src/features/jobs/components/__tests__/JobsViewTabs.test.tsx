
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

const mockJobs = [
    {
        id: "job-active",
        customer_name: "Active Customer",
        pickup_address: "123 Active St",
        dropoff_address: "456 Active Ln",
        scheduled_date: "2023-10-01",
        status: JobStatus.Booked,
        estimated_cost: 1000,
        company_id: "company-1",
        data_creator: "user-1",
        data_updater: "user-1",
        create_time: "1234567890",
        update_time: "1234567890",
    },
    {
        id: "job-quote",
        customer_name: "Quote Customer",
        pickup_address: "789 Quote Rd",
        dropoff_address: "101 Quote Blvd",
        scheduled_date: "2023-11-01",
        status: JobStatus.Quote,
        estimated_cost: 500,
        company_id: "company-1",
        data_creator: "user-1",
        data_updater: "user-1",
        create_time: "1234567890",
        update_time: "1234567890",
    }
];

// Mock JobORM
const mockSetJobById = vi.fn();
const mockDeleteJobByIDs = vi.fn();

vi.mock("@/sdk/database/orm/orm_job", async () => {
    const actual = await vi.importActual("@/sdk/database/orm/orm_job");
    return {
        ...actual,
        JobORM: {
            getInstance: () => ({
                setJobById: mockSetJobById,
                deleteJobByIDs: mockDeleteJobByIDs,
                insertJob: vi.fn(),
            }),
        },
    };
});

describe("JobsView Tabs & Actions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders Active Jobs by default and shows correct jobs", async () => {
        render(
            <Wrapper>
                <JobsView
                    jobs={mockJobs}
                    workers={[]}
                    vehicles={[]}
                    equipment={[]}
                    companyId="company-1"
                />
            </Wrapper>
        );

        // Active Jobs tab should be active
        // Note: Radix UI Tabs might not put aria-selected on role=tab if using older version or different structure.
        // It puts data-state="active".
        const activeTab = screen.getByRole("tab", { name: /Active Jobs/i });
        expect(activeTab).toHaveAttribute("data-state", "active");

        // Should show Active Customer
        expect(screen.getByText("Active Customer")).toBeInTheDocument();

        // Should NOT show Quote Customer
        expect(screen.queryByText("Quote Customer")).not.toBeInTheDocument();
    });

    it("switches to Quotes tab and shows quotes", async () => {
        const user = userEvent.setup();
        render(
            <Wrapper>
                <JobsView
                    jobs={mockJobs}
                    workers={[]}
                    vehicles={[]}
                    equipment={[]}
                    companyId="company-1"
                />
            </Wrapper>
        );

        // Click Quotes tab
        await user.click(screen.getByRole("tab", { name: /Quotes/i }));

        // Active Jobs should disappear
        expect(screen.queryByText("Active Customer")).not.toBeInTheDocument();

        // Quote Customer should appear
        expect(screen.getByText("Quote Customer")).toBeInTheDocument();
    });

    it("calls mutation when 'Book Job' is clicked", async () => {
        const user = userEvent.setup();
        render(
            <Wrapper>
                <JobsView
                    jobs={mockJobs}
                    workers={[]}
                    vehicles={[]}
                    equipment={[]}
                    companyId="company-1"
                />
            </Wrapper>
        );

        // Go to Quotes tab
        await user.click(screen.getByRole("tab", { name: /Quotes/i }));

        // Find "Book Job" button for the quote
        // Use waitFor to ensure tab switch handled
        await waitFor(() => {
            expect(screen.getByText("Quote Customer")).toBeInTheDocument();
        });

        const bookButton = screen.getByRole("button", { name: /Book Job/i });
        await user.click(bookButton);

        await waitFor(() => {
            expect(mockSetJobById).toHaveBeenCalledTimes(1);
            expect(mockSetJobById).toHaveBeenCalledWith("job-quote", expect.objectContaining({
                id: "job-quote",
                status: JobStatus.Booked
            }));
        });
    });
});
