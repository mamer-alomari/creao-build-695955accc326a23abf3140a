import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StorageNetworkView } from "../StorageNetworkView";
import "@testing-library/jest-dom";

// Mock auth
vi.mock("@/sdk/core/auth", () => ({
    useCreaoAuth: () => ({ companyId: "company-1" }),
}));

// Mock Google Maps hook — not loaded by default
vi.mock("@/hooks/use-google-maps", () => ({
    useGoogleMaps: () => ({ isLoaded: false }),
}));

// Mock the ORM
vi.mock("@/sdk/database/orm/orm_storage_facility", () => ({
    StorageFacilityORM: {
        getInstance: vi.fn(() => ({
            getFacilitiesByCompanyId: vi.fn().mockResolvedValue([]),
            deleteFacility: vi.fn().mockResolvedValue(undefined),
            insertFacility: vi.fn().mockResolvedValue(undefined),
        })),
    },
}));

const makeQueryClient = () =>
    new QueryClient({ defaultOptions: { queries: { retry: false } } });

const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={makeQueryClient()}>{children}</QueryClientProvider>
);

describe("StorageNetworkView", () => {
    it("renders the Storage Network heading", () => {
        render(<Wrapper><StorageNetworkView /></Wrapper>);
        expect(screen.getByText("Storage Network")).toBeInTheDocument();
    });

    it("shows empty state when no facilities are saved", async () => {
        render(<Wrapper><StorageNetworkView /></Wrapper>);
        expect(await screen.findByText("No storage facilities.")).toBeInTheDocument();
        expect(screen.getByText("Search and add facilities to build your network.")).toBeInTheDocument();
    });

    it("renders Add Facility button", () => {
        render(<Wrapper><StorageNetworkView /></Wrapper>);
        expect(screen.getByRole("button", { name: /Add Facility/i })).toBeInTheDocument();
    });

    it("opens Add Facility dialog when button is clicked", async () => {
        render(<Wrapper><StorageNetworkView /></Wrapper>);
        fireEvent.click(screen.getByRole("button", { name: /Add Facility/i }));
        expect(await screen.findByText("Add Storage Facility")).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/e.g. Dallas, TX/i)).toBeInTheDocument();
    });

    it("shows 'Type to search' prompt when search input is empty", async () => {
        render(<Wrapper><StorageNetworkView /></Wrapper>);
        fireEvent.click(screen.getByRole("button", { name: /Add Facility/i }));
        expect(await screen.findByText("Type to search for storage facilities.")).toBeInTheDocument();
    });

    it("shows 'No results found' when query entered but Google Maps not loaded", async () => {
        render(<Wrapper><StorageNetworkView /></Wrapper>);
        fireEvent.click(screen.getByRole("button", { name: /Add Facility/i }));
        const input = await screen.findByPlaceholderText(/e.g. Dallas, TX/i);
        fireEvent.change(input, { target: { value: "Dallas" } });
        // With isLoaded=false, search returns [] immediately
        expect(await screen.findByText("No results found.")).toBeInTheDocument();
    });

    it("renders saved facilities when ORM returns data", async () => {
        const { StorageFacilityORM } = await import("@/sdk/database/orm/orm_storage_facility");
        (StorageFacilityORM.getInstance as any).mockReturnValue({
            getFacilitiesByCompanyId: vi.fn().mockResolvedValue([
                {
                    id: "fac-1",
                    name: "CubeSmart Dallas",
                    address: "100 Main St, Dallas, TX",
                    rating: 4.5,
                    user_ratings_total: 200,
                    company_id: "company-1",
                },
            ]),
            deleteFacility: vi.fn(),
            insertFacility: vi.fn(),
        });

        render(<Wrapper><StorageNetworkView /></Wrapper>);
        expect(await screen.findByText("CubeSmart Dallas")).toBeInTheDocument();
        expect(screen.getByText("100 Main St, Dallas, TX")).toBeInTheDocument();
        expect(screen.getByText("4.5 / 5")).toBeInTheDocument();
    });
});
