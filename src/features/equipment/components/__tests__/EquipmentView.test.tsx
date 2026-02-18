import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { EquipmentView } from "../EquipmentView";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { EquipmentType } from "@/sdk/database/orm/orm_equipment";

const queryClient = new QueryClient();

global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const mockEquipment = [
    {
        id: "equip-1",
        name: "Hand Truck",
        total_quantity: 5,
        type: EquipmentType.Reusable,
        company_id: "company-1",
        data_creator: "user-1",
        data_updater: "user-1",
        create_time: "1234567890",
        update_time: "1234567890",
    }
];

describe("EquipmentView", () => {
    it("renders equipment list correctly", () => {
        render(
            <Wrapper>
                <EquipmentView
                    equipment={mockEquipment}
                    companyId="company-1"
                />
            </Wrapper>
        );

        expect(screen.getByText("Equipment Management")).toBeInTheDocument();
        expect(screen.getByText("Hand Truck")).toBeInTheDocument();
        expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("opens create equipment dialog", async () => {
        const user = userEvent.setup();
        render(
            <Wrapper>
                <EquipmentView
                    equipment={[]}
                    companyId="company-1"
                />
            </Wrapper>
        );

        const newBtn = screen.getByRole("button", { name: /New Equipment/i });
        await user.click(newBtn);

        await waitFor(() => {
            expect(screen.getByRole("heading", { name: "Create New Equipment" })).toBeInTheDocument();
            expect(screen.getByLabelText("Equipment Name")).toBeInTheDocument();
        });
    });

    it("shows empty state when no equipment", () => {
        render(
            <Wrapper>
                <EquipmentView
                    equipment={[]}
                    companyId="company-1"
                />
            </Wrapper>
        );

        expect(screen.getByText("No equipment yet. Add your first equipment item to get started.")).toBeInTheDocument();
    });
});
