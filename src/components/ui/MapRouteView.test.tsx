
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MapRouteView } from "./MapRouteView";

// Mock Google Maps API
const mockDirectionsService = {
    route: vi.fn()
};

const mockDirectionsRenderer = {
    setDirections: vi.fn(),
    setMap: vi.fn()
};

const mockMap = {
    setCenter: vi.fn(),
    setZoom: vi.fn()
};

// Setup global Google Maps mock
global.window.google = {
    maps: {
        Map: vi.fn(() => mockMap),
        DirectionsService: vi.fn(() => mockDirectionsService),
        DirectionsRenderer: vi.fn(() => mockDirectionsRenderer),
        TravelMode: { DRIVING: 'DRIVING' },
        DirectionsStatus: { OK: 'OK' }
    }
} as any;

// Mock the hook
vi.mock("@/hooks/use-google-maps", () => ({
    useGoogleMaps: () => ({ isLoaded: true, error: null })
}));

describe("MapRouteView", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("initializes map and renderer on load", () => {
        render(
            <MapRouteView
                origin="New York, NY"
                destination="Boston, MA"
            />
        );

        expect(window.google.maps.Map).toHaveBeenCalled();
        expect(window.google.maps.DirectionsRenderer).toHaveBeenCalled();
    });

    it("calculates route when origin and destination are present", async () => {
        mockDirectionsService.route.mockImplementation((req, callback) => {
            callback({ routes: [] }, 'OK');
        });

        render(
            <MapRouteView
                origin="New York, NY"
                destination="Boston, MA"
            />
        );

        await waitFor(() => {
            expect(mockDirectionsService.route).toHaveBeenCalledWith(
                expect.objectContaining({
                    origin: "New York, NY",
                    destination: "Boston, MA",
                    travelMode: 'DRIVING'
                }),
                expect.any(Function)
            );
        });

        expect(mockDirectionsRenderer.setDirections).toHaveBeenCalled();
    });

    it("handles route error gracefully", async () => {
        // Suppress console error for this test
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        mockDirectionsService.route.mockImplementation((req, callback) => {
            callback(null, 'ZERO_RESULTS');
        });

        render(
            <MapRouteView
                origin="Unknown Place"
                destination="Another Unknown Place"
            />
        );

        await waitFor(() => {
            expect(screen.getByText(/Could not calculate route/i)).toBeInTheDocument();
        });

        consoleSpy.mockRestore();
    });
});
