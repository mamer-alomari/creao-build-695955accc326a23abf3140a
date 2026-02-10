import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardView } from "../DashboardView";
import { JobStatus } from "@/sdk/database/orm/orm_job";
import { WorkerRole, WorkerStatus } from "@/sdk/database/orm/orm_worker";
import "@testing-library/jest-dom";

// Mock data
const mockJobs = [
    {
        id: "job-1",
        customer_name: "John Doe",
        pickup_address: "123 Main St",
        dropoff_address: "456 Oak Ave",
        scheduled_date: (Date.now() / 1000).toString(),
        status: JobStatus.Booked,
        company_id: "company-1",
    }
];

const mockWorkers = [
    {
        id: "worker-1",
        full_name: "Jane Smith",
        role: WorkerRole.Mover,
        status: WorkerStatus.Active,
        company_id: "company-1",
    }
];

const mockEquipment = [];
const mockVehicles = [];

describe("DashboardView", () => {
    it("renders summary cards correctly", () => {
        render(
            <DashboardView
                jobs={mockJobs}
                workers={mockWorkers}
                equipment={mockEquipment}
                vehicles={mockVehicles}
                activeWorkers={mockWorkers}
                upcomingJobs={mockJobs}
            />
        );

        // Check for summary cards
        expect(screen.getByText("Total Jobs")).toBeInTheDocument();
        expect(screen.getByText("Active Workers")).toBeInTheDocument();
        expect(screen.getByText("Equipment Items")).toBeInTheDocument();
        expect(screen.getByText("Fleet Vehicles")).toBeInTheDocument();

        // Check for values
        // Check for values - we have 1 job and 1 active worker, so we expect multiple "1"s
        expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(2);
    });

    it("renders upcoming jobs table", () => {
        render(
            <DashboardView
                jobs={mockJobs}
                workers={mockWorkers}
                equipment={mockEquipment}
                vehicles={mockVehicles}
                activeWorkers={mockWorkers}
                upcomingJobs={mockJobs}
            />
        );

        expect(screen.getByText("Upcoming Jobs")).toBeInTheDocument();
        expect(screen.getByText("John Doe")).toBeInTheDocument();
        // Use regex for partial match as the address is combined with arrow
        expect(screen.getByText(/123 Main St/)).toBeInTheDocument();
    });

    it("displays correct status badge", () => {
        render(
            <DashboardView
                jobs={mockJobs}
                workers={mockWorkers}
                equipment={mockEquipment}
                vehicles={mockVehicles}
                activeWorkers={mockWorkers}
                upcomingJobs={mockJobs}
            />
        );

        expect(screen.getByText("Booked")).toBeInTheDocument();
    });
});
