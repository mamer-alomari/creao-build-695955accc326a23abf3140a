import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VehiclesView } from "../VehiclesView";
import { VehicleType } from "@/sdk/database/orm/orm_vehicle";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";

const queryClient = new QueryClient();

const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

// Mocks
vi.mock("@/sdk/core/auth", () => ({
    useCreaoAuth: () => ({
        companyId: "company-1",
        user: { uid: "user-1" }
    })
}));

vi.mock("@/sdk/database/orm/orm_vehicle", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/sdk/database/orm/orm_vehicle")>();
    return {
        ...actual,
        VehicleORM: {
            getInstance: vi.fn(() => ({
                createVehicle: vi.fn().mockResolvedValue({ id: "new-vehicle-1" }),
                getVehiclesByCompanyId: vi.fn().mockResolvedValue([]),
                updateVehicle: vi.fn(),
                deleteVehicle: vi.fn()
            }))
        }
    };
});

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

        expect(screen.getByText("No vehicles yet.")).toBeInTheDocument();
    });
});
