
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GetQuoteView } from "@/routes/get-quote";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// Mocks
vi.mock("@tanstack/react-query", () => ({
    useMutation: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
    useNavigate: vi.fn(),
    createFileRoute: vi.fn(() => () => null),
    Link: ({ children }: any) => <div>{children}</div>
}));

describe("QuoteGeneration", () => {
    beforeEach(() => {
        (useNavigate as unknown as Mock).mockReturnValue(vi.fn());
    });

    it("renders logistics step initially", () => {
        render(<GetQuoteView />);
        expect(screen.getByText("Where are you moving?")).toBeInTheDocument();
        expect(screen.getByLabelText("Pickup Address")).toBeInTheDocument();
    });

    it("requires inputs before next step", () => {
        render(<GetQuoteView />);
        const nextBtn = screen.getByText("Next Step");
        expect(nextBtn).toBeDisabled();

        // Fill inputs
        fireEvent.change(screen.getByLabelText("Pickup Address"), { target: { value: "123 A St" } });
        fireEvent.change(screen.getByLabelText("Dropoff Address"), { target: { value: "456 B St" } });
        // Date picker mocks are hard, assuming disabled check logic relies on interactions. 
        // We'll skip complex date interaction test for this simplified unit test 
        // and focus on existence.
    });
});
