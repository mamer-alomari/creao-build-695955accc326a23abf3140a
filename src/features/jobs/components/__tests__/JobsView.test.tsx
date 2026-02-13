import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
        id: "job-1",
        customer_name: "Alice Johnson",
        pickup_address: "789 Pine Rd",
        dropoff_address: "101 Maple Ln",
        scheduled_date: (Date.now() / 1000).toString(),
        status: JobStatus.Quote,
        estimated_cost: 500,
        company_id: "company-1",
        data_creator: "user-1",
        data_updater: "user-1",
        create_time: "1234567890",
        update_time: "1234567890",
    }
];

describe("JobsView", () => {
    it("renders jobs list correctly", () => {
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

        expect(screen.getByText("Jobs Management")).toBeInTheDocument();
        expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
        expect(screen.getByText("789 Pine Rd")).toBeInTheDocument();
        expect(screen.getByText("$500.00")).toBeInTheDocument();
        expect(screen.getByText("Quote")).toBeInTheDocument();
    });

    it("opens create job dialog", async () => {
        render(
            <Wrapper>
                <JobsView
                    jobs={[]}
                    workers={[]}
                    vehicles={[]}
                    equipment={[]}
                    companyId="company-1"
                />
            </Wrapper>
        );

        const createButton = screen.getAllByRole("button", { name: "Quick Job" })[0];
        fireEvent.click(createButton);

        expect(screen.getByRole("heading", { name: "Create New Job" })).toBeInTheDocument();
        expect(screen.getByLabelText("Customer Name")).toBeInTheDocument();
    });

    it("shows empty state when no jobs", () => {
        render(
            <Wrapper>
                <JobsView
                    jobs={[]}
                    workers={[]}
                    vehicles={[]}
                    equipment={[]}
                    companyId="company-1"
                />
            </Wrapper>
        );

        expect(screen.getByText("No jobs yet. Create your first job to get started.")).toBeInTheDocument();
    });
});
