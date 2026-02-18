
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReportIncidentDialog } from "../components/ReportIncidentDialog";
import { IncidentORM } from "@/sdk/database/orm/orm_incident";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock Firebase Storage
vi.mock("firebase/storage", () => ({
    getStorage: vi.fn(),
    ref: vi.fn(),
    uploadBytesResumable: vi.fn(() => ({
        on: (event: string, progress: any, error: any, complete: any) => {
            // Simulate immediate completion
            complete();
        },
        snapshot: { ref: {} }
    })),
    getDownloadURL: vi.fn().mockResolvedValue("http://mock-url.com/file.jpg")
}));

vi.mock("@/lib/firebase", () => ({
    storage: {}
}));

vi.mock("@/sdk/core/auth", () => ({
    useCreaoAuth: () => ({
        companyId: "test-company",
        user: { uid: "user-123" }
    })
}));

const mockCreateIncident = vi.fn();

vi.mock("@/sdk/database/orm/orm_incident", () => ({
    IncidentORM: {
        getInstance: vi.fn(() => ({
            createIncident: mockCreateIncident
        }))
    }
}));

// Mock alert to prevent jsdom errors
window.alert = vi.fn();

const createTestQueryClient = () => new QueryClient({
    defaultOptions: { queries: { retry: false } },
});

const renderWithClient = (ui: React.ReactNode) => {
    const client = createTestQueryClient();
    return render(
        <QueryClientProvider client={client}>
            {ui}
        </QueryClientProvider>
    );
};

describe("ReportIncidentDialog", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCreateIncident.mockResolvedValue({});
    });

    it("opens dialog when trigger is clicked", async () => {
        renderWithClient(<ReportIncidentDialog />);

        const trigger = screen.getByText("Report Incident");
        fireEvent.click(trigger);

        await waitFor(() => {
            expect(screen.getByText("Report an Incident")).toBeInTheDocument();
        });
    });

    it("validates form input", async () => {
        renderWithClient(<ReportIncidentDialog />);
        fireEvent.click(screen.getByText("Report Incident"));

        // Submit button should be disabled initially or validation prevents call
        const submitBtn = screen.getByText("Submit Report");
        fireEvent.click(submitBtn);

        expect(mockCreateIncident).not.toHaveBeenCalled();
    });

    it("submits incident with data", async () => {
        renderWithClient(<ReportIncidentDialog />);
        fireEvent.click(screen.getByText("Report Incident"));

        // Fill description
        const descInput = screen.getByLabelText("Description");
        fireEvent.change(descInput, { target: { value: "Test accident description" } });

        // Submit
        const submitBtn = screen.getByText("Submit Report");
        expect(submitBtn).not.toBeDisabled();
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(mockCreateIncident).toHaveBeenCalledWith(expect.objectContaining({
                description: "Test accident description",
                type: "other" // Default
            }));
        });
    });
});
