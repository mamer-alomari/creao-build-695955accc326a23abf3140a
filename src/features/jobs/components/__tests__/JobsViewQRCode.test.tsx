import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { JobsView } from "../JobsView";
import { JobStatus, type JobModel } from "@/sdk/database/orm/orm_job";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";

// Mock dependencies
vi.mock("@/hooks/use-distance-matrix", () => ({
    useDistanceMatrix: () => ({
        calculateDistance: vi.fn(),
        isLoading: false,
        error: null,
    }),
}));

vi.mock("@/hooks/use-google-vision", () => ({
    useAnalyzeRoomImage: () => ({
        mutateAsync: vi.fn(),
    }),
    fileToDataUrl: vi.fn(),
    ROOM_TYPES: [],
    ITEM_CATEGORIES: [],
}));

// Mock React Query
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const mockJob: JobModel = {
    id: "job-qr-123",
    customer_name: "QR User",
    pickup_address: "123 QR St",
    dropoff_address: "456 Code Ln",
    scheduled_date: new Date().toISOString(),
    status: JobStatus.Quote,
    estimated_cost: 100,
    company_id: "company-1",
    data_creator: "user-1",
    data_updater: "user-1",
    create_time: "1234567890",
    update_time: "1234567890",
};

describe("JobsView QR Code", () => {
    it("displays QR code in edit dialog", async () => {
        const user = userEvent.setup();
        render(
            <Wrapper>
                <JobsView
                    jobs={[mockJob]}
                    workers={[]}
                    vehicles={[]}
                    equipment={[]}
                    companyId="company-1"
                />
            </Wrapper>
        );

        // Job is Quote status — switch to Quotes tab first
        await user.click(screen.getByRole("tab", { name: /Quotes/i }));

        // Wait for the job row to appear, then click it
        await waitFor(() => expect(screen.getByText("QR User")).toBeInTheDocument());
        await user.click(screen.getByText("QR User"));

        // Check for QR Code section header
        expect(await screen.findByText("Job QR Code")).toBeInTheDocument();

        // Check for Job ID display which is part of the QR section
        const jobIds = screen.getAllByText(/job-qr-123/);
        expect(jobIds.length).toBeGreaterThanOrEqual(1);

        // Check if SVG (QR code) is present
        // react-qr-code renders an svg
        const qrContainer = screen.getByTestId("qr-code-container");
        const svg = qrContainer.querySelector("svg");
        expect(svg).toBeInTheDocument();
        expect(svg).toHaveAttribute("viewBox");
        // Ensure it's not a standard icon (usually 24x24)
        expect(svg?.getAttribute("viewBox")).not.toBe("0 0 24 24");
    });
});
