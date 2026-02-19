import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SchedulingView } from "../SchedulingView";
import { JobStatus } from "@/sdk/database/orm/orm_job";
import { WorkerRole, WorkerStatus } from "@/sdk/database/orm/orm_worker";
import { VehicleType } from "@/sdk/database/orm/orm_vehicle";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";

const queryClient = new QueryClient();

const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const mockJobs = [
    {
        id: "job-1",
        customer_name: "Active Job",
        status: JobStatus.Booked,
        pickup_address: "A",
        dropoff_address: "B",
        scheduled_date: (Date.now() / 1000).toString(),
        company_id: "company-1",
        data_creator: "user-1",
        data_updater: "user-1",
        create_time: "1234567890",
        update_time: "1234567890",
    }
];

const mockWorkers = [
    {
        id: "worker-1",
        full_name: "Worker One",
        role: WorkerRole.Mover,
        status: WorkerStatus.Active,
        company_id: "company-1",
        data_creator: "user-1",
        data_updater: "user-1",
        create_time: "1234567890",
        update_time: "1234567890",
    }
];

const mockVehicles = [
    {
        id: "vehicle-1",
        vehicle_name: "Truck One",
        type: VehicleType.BoxTruck16ft,
        license_plate: "123",
        company_id: "company-1",
        data_creator: "user-1",
        data_updater: "user-1",
        create_time: "1234567890",
        update_time: "1234567890",
    }
];

const mockAssignments = [
    {
        id: "assign-1",
        job_id: "job-1",
        worker_id: "worker-1",
        company_id: "company-1",
        data_creator: "user-1",
        data_updater: "user-1",
        create_time: "1234567890",
        update_time: "1234567890",
    }
];

describe("SchedulingView", () => {
    it("renders active jobs and assignments", () => {
        render(
            <Wrapper>
                <SchedulingView
                    jobs={mockJobs}
                    workers={mockWorkers}
                    equipment={[]}
                    vehicles={mockVehicles}
                    jobAssignments={mockAssignments}
                    vehicleAssignments={[]}
                    equipmentAllocations={[]}
                    companyId="company-1"
                />
            </Wrapper>
        );

        expect(screen.getByText("Job Scheduling")).toBeInTheDocument();
        expect(screen.getByText("Active Job")).toBeInTheDocument();
        expect(screen.getByText("Worker One")).toBeInTheDocument();
    });

    it("shows empty state when no active jobs", () => {
        render(
            <Wrapper>
                <SchedulingView
                    jobs={[]}
                    workers={[]}
                    equipment={[]}
                    vehicles={[]}
                    jobAssignments={[]}
                    vehicleAssignments={[]}
                    equipmentAllocations={[]}
                    companyId="company-1"
                />
            </Wrapper>
        );

        expect(screen.getByText("No active jobs to schedule.")).toBeInTheDocument();
    });

    it("opens assign resource dialog", async () => {
        const user = userEvent.setup();
        render(
            <Wrapper>
                <SchedulingView
                    jobs={mockJobs}
                    workers={mockWorkers}
                    equipment={[]}
                    vehicles={mockVehicles}
                    jobAssignments={[]}
                    vehicleAssignments={[]}
                    equipmentAllocations={[]}
                    companyId="company-1"
                />
            </Wrapper>
        );

        await user.click(screen.getByRole("button", { name: "Manage Resources" }));

        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Manage Resources" })).toBeInTheDocument();
    });
});
