import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EquipmentView } from "../EquipmentView";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";

const queryClient = new QueryClient();

const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const mockEquipment = [
    {
        id: "equip-1",
        name: "Hand Truck",
        total_quantity: 5,
        company_id: "company-1",
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

    it("opens create equipment dialog", () => {
        render(
            <Wrapper>
                <EquipmentView
                    equipment={[]}
                    companyId="company-1"
                />
            </Wrapper>
        );

        fireEvent.click(screen.getAllByRole("button", { name: "New Equipment" })[0]);

        expect(screen.getByRole("heading", { name: "Create New Equipment" })).toBeInTheDocument();
        expect(screen.getByLabelText("Equipment Name")).toBeInTheDocument();
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
