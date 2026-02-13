import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VehiclesView } from "../VehiclesView";
import { VehicleType } from "@/sdk/database/orm/orm_vehicle";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";

const queryClient = new QueryClient();

const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const mockVehicles = [
    {
        id: "vehicle-1",
        vehicle_name: "Truck 1",
        license_plate: "ABC-123",
        type: VehicleType.BoxTruck26ft,
        capacity_cft: 1500,
        company_id: "company-1",
        data_creator: "user-1",
        data_updater: "user-1",
        create_time: "1234567890",
        update_time: "1234567890",
    }
];

describe("VehiclesView", () => {
    it("renders vehicles list correctly", () => {
        render(
            <Wrapper>
                <VehiclesView
                    vehicles={mockVehicles}
                    companyId="company-1"
                />
            </Wrapper>
        );

        expect(screen.getByText("Vehicles Management")).toBeInTheDocument();
        expect(screen.getByText("Truck 1")).toBeInTheDocument();
        expect(screen.getByText("ABC-123")).toBeInTheDocument();
        expect(screen.getByText("Box Truck 26ft")).toBeInTheDocument();
    });

    it("opens create vehicle dialog", () => {
        render(
            <Wrapper>
                <VehiclesView
                    vehicles={[]}
                    companyId="company-1"
                />
            </Wrapper>
        );

        fireEvent.click(screen.getAllByRole("button", { name: "New Vehicle" })[0]);

        expect(screen.getByRole("heading", { name: "Create New Vehicle" })).toBeInTheDocument();
        expect(screen.getByLabelText("Vehicle Name")).toBeInTheDocument();
    });

    it("shows empty state when no vehicles", () => {
        render(
            <Wrapper>
                <VehiclesView
                    vehicles={[]}
                    companyId="company-1"
                />
            </Wrapper>
        );

        expect(screen.getByText("No vehicles yet. Add your first vehicle to get started.")).toBeInTheDocument();
    });
});
