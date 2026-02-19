import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EarningsView } from "../EarningsView";
import { JobStatus, type JobModel } from "@/sdk/database/orm/orm_job";
import "@testing-library/jest-dom";

const baseJob = (overrides: Partial<JobModel>): JobModel => ({
    id: "job-1",
    customer_name: "Test Customer",
    pickup_address: "123 A St",
    dropoff_address: "456 B St",
    scheduled_date: new Date().toISOString(),
    status: JobStatus.Completed,
    company_id: "company-1",
    data_creator: "user-1",
    data_updater: "user-1",
    create_time: "1234567890",
    update_time: "1234567890",
    ...overrides,
});

describe("EarningsView", () => {
    it("shows $0.00 revenue and 0 jobs when no jobs provided", () => {
        render(<EarningsView jobs={[]} />);
        // Both Total Revenue and Average per Job show $0.00 — check at least one exists
        expect(screen.getAllByText("$0.00").length).toBeGreaterThanOrEqual(2);
        expect(screen.getByText("Across 0 completed jobs")).toBeInTheDocument();
    });

    it("shows empty table message when no completed jobs", () => {
        render(<EarningsView jobs={[]} />);
        expect(screen.getByText("No completed jobs found.")).toBeInTheDocument();
    });

    it("only counts completed jobs — ignores quotes and booked jobs", () => {
        const jobs = [
            baseJob({ id: "j1", status: JobStatus.Completed, full_price: 500 }),
            baseJob({ id: "j2", status: JobStatus.Quote, full_price: 1000 }),
            baseJob({ id: "j3", status: JobStatus.Booked, full_price: 800 }),
        ];
        render(<EarningsView jobs={jobs} />);
        expect(screen.getByText("Across 1 completed jobs")).toBeInTheDocument();
        // Total revenue = 500, average = 500 — both cards show $500.00
        expect(screen.getAllByText("$500.00").length).toBeGreaterThanOrEqual(1);
    });

    it("uses full_price when available", () => {
        const jobs = [
            baseJob({ id: "j1", full_price: 750, estimated_cost: 500 }),
        ];
        render(<EarningsView jobs={jobs} />);
        // Both revenue and average show 750 — check at least one
        expect(screen.getAllByText("$750.00").length).toBeGreaterThanOrEqual(1);
    });

    it("falls back to estimated_cost when full_price is absent", () => {
        const jobs = [
            baseJob({ id: "j1", full_price: undefined, estimated_cost: 300 }),
        ];
        render(<EarningsView jobs={jobs} />);
        // Total revenue card shows $300.00
        expect(screen.getAllByText("$300.00").length).toBeGreaterThan(0);
        // Shows asterisk disclaimer
        expect(screen.getByText(/Showing estimated cost where full price is not set/)).toBeInTheDocument();
    });

    it("calculates correct total revenue across multiple completed jobs", () => {
        const jobs = [
            baseJob({ id: "j1", full_price: 500 }),
            baseJob({ id: "j2", full_price: 250 }),
            baseJob({ id: "j3", full_price: 250 }),
        ];
        render(<EarningsView jobs={jobs} />);
        expect(screen.getByText("Across 3 completed jobs")).toBeInTheDocument();
        expect(screen.getByText("$1,000.00")).toBeInTheDocument();
    });

    it("calculates correct average per job", () => {
        const jobs = [
            baseJob({ id: "j1", full_price: 600 }),
            baseJob({ id: "j2", full_price: 400 }),
        ];
        render(<EarningsView jobs={jobs} />);
        // Average = 500
        expect(screen.getByText("$500.00")).toBeInTheDocument();
    });

    it("renders completed job rows with customer name and route", () => {
        const jobs = [
            baseJob({
                id: "j1",
                customer_name: "Alice Movers",
                pickup_address: "10 Oak Ave",
                dropoff_address: "20 Elm St",
                full_price: 400,
            }),
        ];
        render(<EarningsView jobs={jobs} />);
        expect(screen.getByText("Alice Movers")).toBeInTheDocument();
        expect(screen.getByText(/10 Oak Ave/)).toBeInTheDocument();
    });
});
