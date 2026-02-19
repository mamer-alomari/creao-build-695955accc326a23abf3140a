import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardView } from "../DashboardView";
import { JobStatus, type JobModel } from "@/sdk/database/orm/orm_job";
import { WorkerRole, WorkerStatus, type WorkerModel } from "@/sdk/database/orm/orm_worker";
import { type EquipmentModel } from "@/sdk/database/orm/orm_equipment";
import { type VehicleModel } from "@/sdk/database/orm/orm_vehicle";
import "@testing-library/jest-dom";

// Mock data
const mockJobs: JobModel[] = [
    {
        id: "job-1",
        customer_name: "John Doe",
        pickup_address: "123 Main St",
        dropoff_address: "456 Oak Ave",
        scheduled_date: new Date().toISOString(),
        status: JobStatus.Booked,
        company_id: "company-1",
        data_creator: "user-1",
        data_updater: "user-1",
        create_time: "1234567890",
        update_time: "1234567890",
    }
];

const mockWorkers: WorkerModel[] = [
    {
        id: "worker-1",
        full_name: "Jane Smith",
        role: WorkerRole.Mover,
        status: WorkerStatus.Active,
        company_id: "company-1",
        data_creator: "user-1",
        data_updater: "user-1",
        create_time: "1234567890",
        update_time: "1234567890",
    }
];

const mockEquipment: EquipmentModel[] = [];
const mockVehicles: VehicleModel[] = [];

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
