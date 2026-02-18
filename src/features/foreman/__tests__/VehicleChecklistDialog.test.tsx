
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { VehicleChecklistDialog } from "../components/VehicleChecklistDialog";

vi.mock("@/sdk/core/auth", () => ({
    useCreaoAuth: () => ({
        user: { uid: "user-123" }
    })
}));

describe("VehicleChecklistDialog", () => {
    const mockConfirm = vi.fn();
    const mockClose = vi.fn();

    beforeAll(() => {
        global.ResizeObserver = class ResizeObserver {
            observe() { }
            unobserve() { }
            disconnect() { }
        };
    });

    it("renders all checklist items", () => {
        render(
            <VehicleChecklistDialog
                isOpen={true}
                onClose={mockClose}
                onConfirm={mockConfirm}
                vehicleName="Test Truck"
            />
        );

        expect(screen.getByText("Vehicle Starts")).toBeInTheDocument();
        expect(screen.getByText("No check engine light")).toBeInTheDocument();
        expect(screen.getByText("Vehicle warmed up")).toBeInTheDocument();
        expect(screen.getByText("Equipment in vehicle")).toBeInTheDocument();
    });

    it("disables confirm button until all checked", () => {
        render(
            <VehicleChecklistDialog
                isOpen={true}
                onClose={mockClose}
                onConfirm={mockConfirm}
                vehicleName="Test Truck"
            />
        );

        const confirmBtn = screen.getByText("Confirm & Start Route");
        expect(confirmBtn).toBeDisabled();

        // Check one
        fireEvent.click(screen.getByText("Vehicle Starts"));
        expect(confirmBtn).toBeDisabled();
    });

    it("enables button when all checked and submits", () => {
        render(
            <VehicleChecklistDialog
                isOpen={true}
                onClose={mockClose}
                onConfirm={mockConfirm}
                vehicleName="Test Truck"
            />
        );

        fireEvent.click(screen.getByText("Vehicle Starts"));
        fireEvent.click(screen.getByText("No check engine light"));
        fireEvent.click(screen.getByText("Vehicle warmed up"));
        fireEvent.click(screen.getByText("Equipment in vehicle"));

        const confirmBtn = screen.getByText("Confirm & Start Route");
        expect(confirmBtn).not.toBeDisabled();

        fireEvent.click(confirmBtn);
        expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({
            engine_start: true,
            equipment_present: true,
            completed_by: "user-123"
        }));
    });
});
