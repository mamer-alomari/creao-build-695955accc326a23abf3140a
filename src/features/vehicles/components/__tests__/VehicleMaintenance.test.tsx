import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { VehiclesView } from "../VehiclesView";
import { VehicleORM, VehicleType, type VehicleModel } from "@/sdk/database/orm/orm_vehicle";
import { MaintenanceRecordORM, MaintenanceType, type MaintenanceRecordModel } from "@/sdk/database/orm/orm_maintenance_record";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";

// Mock the ORMs
vi.mock("@/sdk/database/orm/orm_vehicle");
vi.mock("@/sdk/database/orm/orm_maintenance_record");

const mockVehicles: VehicleModel[] = [
    {
        id: "v1",
        vehicle_name: "Truck 1",
        license_plate: "ABC-123",
        type: VehicleType.BoxTruck16ft,
        capacity_cft: 1000,
        company_id: "comp1",
        data_creator: "user1",
        data_updater: "user1",
        create_time: "2023-01-01",
        update_time: "2023-01-01",
    }
];

const mockMaintenanceRecords: MaintenanceRecordModel[] = [
    {
        id: "m1",
        vehicle_id: "v1",
        company_id: "comp1",
        service_date: "2023-01-15",
        description: "Oil Change",
        cost: 150,
        performed_by: "Mechanic A",
        type: MaintenanceType.Routine,
        data_creator: "user1",
        data_updater: "user1",
        create_time: "2023-01-15",
        update_time: "2023-01-15",
    }
];

describe("VehiclesView Maintenance", () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        });

        vi.resetAllMocks();

        // Setup VehicleORM mock
        const mockVehicleORMInstance = {
            getAllVehicle: vi.fn().mockResolvedValue(mockVehicles),
            insertVehicle: vi.fn(),
            deleteVehicleByIDs: vi.fn(),
        };
        (VehicleORM.getInstance as any).mockReturnValue(mockVehicleORMInstance);

        // Setup MaintenanceRecordORM mock
        const mockMaintenanceORMInstance = {
            getAllMaintenanceRecord: vi.fn().mockResolvedValue(mockMaintenanceRecords),
            insertMaintenanceRecord: vi.fn().mockResolvedValue([{ ...mockMaintenanceRecords[0], id: "m2", description: "New Repair" }]),
        };
        (MaintenanceRecordORM.getInstance as any).mockReturnValue(mockMaintenanceORMInstance);
    });

    it("opens maintenance sheet when wrench icon is clicked", async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <VehiclesView vehicles={mockVehicles} companyId="comp1" />
            </QueryClientProvider>
        );

        // Find and click the maintenance button (wrench icon)
        // We use getAllByRole('button') and look for the one with the wrench icon, 
        // or since we know it's in the actions column, we can try to be more specific if possible.
        // Given the DOM structure, the wrench button is likely the first one in the row's action cell if looking at the code, 
        // but there's also a delete button. The wrench is rendered first in the code I wrote? No, create is in header.
        // In the row: Wrench (SheetTrigger) then Trash2 (Delete).
        // Let's rely on the Wrench icon being present or use a test-id in production code, but here we can try to find by icon content if rendered, 
        // or just assume the order.
        // Better: look for the trigger which wraps the button.

        // Actually, let's just use fireEvent on the button that contains the maintenance logic.
        // To make it robust, we should probably add aria-labels to the buttons in the source code, but for now let's try to query by role.

        // There are 2 buttons per row (Wrench, Trash2) + 1 "New Vehicle" button on top.
        const buttons = screen.getAllByRole("button");
        // Index 0: New Vehicle
        // Index 1: Maintenance (Wrench) for row 1
        // Index 2: Delete (Trash) for row 1

        await userEvent.click(buttons[1]);

        await waitFor(() => {
            expect(screen.getByText("Maintenance Records")).toBeInTheDocument();
            expect(screen.getByText(/Maintenance history for Truck 1/)).toBeInTheDocument();
        });
    });

    it("displays existing maintenance records", async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <VehiclesView vehicles={mockVehicles} companyId="comp1" />
            </QueryClientProvider>
        );

        const buttons = screen.getAllByRole("button");
        await userEvent.click(buttons[1]);

        await waitFor(() => {
            expect(screen.getByText("Oil Change")).toBeInTheDocument();
            expect(screen.getByText("$150.00")).toBeInTheDocument();
            expect(screen.getByText(/Mechanic A/)).toBeInTheDocument();
        });
    });

    it("allows adding a new maintenance record", async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <VehiclesView vehicles={mockVehicles} companyId="comp1" />
            </QueryClientProvider>
        );

        const buttons = screen.getAllByRole("button");
        await userEvent.click(buttons[1]);

        // Fill out the form
        await userEvent.type(screen.getByPlaceholderText("Oil change, brake pad replacement..."), "Brake Replacement");

        // For number inputs, userEvent.type works best
        // We need to find the Cost input. It has a label "Cost ($)".
        const costInput = screen.getByLabelText("Cost ($)");
        await userEvent.type(costInput, "200");

        const performedByInput = screen.getByPlaceholderText("Mechanic or shop name");
        await userEvent.type(performedByInput, "Shop B");

        // Click Add Record
        const addRectButton = screen.getByText("Add Record");
        await userEvent.click(addRectButton);

        await waitFor(() => {
            const maintenanceOrm = MaintenanceRecordORM.getInstance();
            expect(maintenanceOrm.insertMaintenanceRecord).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({
                    description: "Brake Replacement",
                    cost: 200,
                    performed_by: "Shop B",
                    vehicle_id: "v1",
                })
            ]));
        });
    });
});
