import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkersView } from "../WorkersView";
import { WorkerRole, WorkerStatus, type WorkerModel } from "@/sdk/database/orm/orm_worker";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";

const queryClient = new QueryClient();

const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

// Mocks
vi.mock("@/sdk/core/auth", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/sdk/core/auth")>();
    return {
        ...actual,
        useCreaoAuth: () => ({
            companyId: "company-1",
            user: { uid: "user-1" },
            role: actual.UserRole.Manager
        })
    };
});

const mockWorkers: WorkerModel[] = [
    {
        id: "worker-1",
        full_name: "Bob Builder",
        role: WorkerRole.Driver,
        status: WorkerStatus.Active,
        company_id: "company-1",
        data_creator: "user-1",
        data_updater: "user-1",
        create_time: "1234567890",
        update_time: "1234567890",
    }
];

describe("WorkersView", () => {
    it("renders workers list correctly", () => {
        render(
            <Wrapper>
                <WorkersView
                    workers={mockWorkers}
                    companyId="company-1"
                />
            </Wrapper>
        );

        expect(screen.getByText("Workers Management")).toBeInTheDocument();
        expect(screen.getByText("Bob Builder")).toBeInTheDocument();
        expect(screen.getByText("Driver")).toBeInTheDocument();
        expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("opens create worker dialog", () => {
        render(
            <Wrapper>
                <WorkersView
                    workers={[]}
                    companyId="company-1"
                />
            </Wrapper>
        );

        fireEvent.click(screen.getAllByRole("button", { name: "New Worker" })[0]);

        expect(screen.getByRole("heading", { name: "Create New Worker" })).toBeInTheDocument();
        expect(screen.getByLabelText("Full Name")).toBeInTheDocument();
        expect(screen.getByLabelText("Email")).toBeInTheDocument();
        expect(screen.getByLabelText("Phone Number")).toBeInTheDocument();
    });

    it("shows empty state when no workers", () => {
        render(
            <Wrapper>
                <WorkersView
                    workers={[]}
                    companyId="company-1"
                />
            </Wrapper>
        );

        expect(screen.getByText("No workers yet. Add your first worker to get started.")).toBeInTheDocument();
    });
});
