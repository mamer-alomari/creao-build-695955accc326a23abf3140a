import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WorkerScheduleView } from "../WorkerScheduleView";
import "@testing-library/jest-dom";

vi.mock("@/sdk/core/auth", () => ({
    useCreaoAuth: () => ({
        user: { uid: "worker-1" },
        companyId: "company-1",
    }),
}));

vi.mock("@/sdk/database/orm/orm_worker_schedule", () => ({
    WorkerScheduleORM: {
        getInstance: vi.fn(() => ({
            getSchedulesByWorkerAndDateRange: vi.fn().mockResolvedValue([]),
            setSchedule: vi.fn().mockResolvedValue(undefined),
            deleteSchedule: vi.fn().mockResolvedValue(undefined),
        })),
    },
}));

const makeQueryClient = () =>
    new QueryClient({ defaultOptions: { queries: { retry: false } } });

const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={makeQueryClient()}>{children}</QueryClientProvider>
);

describe("WorkerScheduleView", () => {
    it("renders My Availability heading", async () => {
        render(<Wrapper><WorkerScheduleView /></Wrapper>);
        expect(screen.getByText("My Availability")).toBeInTheDocument();
    });

    it("renders a calendar for date selection", () => {
        render(<Wrapper><WorkerScheduleView /></Wrapper>);
        // The shadcn Calendar renders day buttons
        const dayButtons = screen.getAllByRole("button").filter(
            (btn) => !isNaN(Number(btn.textContent))
        );
        expect(dayButtons.length).toBeGreaterThan(0);
    });

    it("shows 'No availability set for this date' for a date with no schedule", async () => {
        render(<Wrapper><WorkerScheduleView /></Wrapper>);
        // A date is pre-selected (today), and schedules are empty → should show no-availability message
        expect(await screen.findByText("No availability set for this date.")).toBeInTheDocument();
    });

    it("shows Set Availability button when date has no schedule", async () => {
        render(<Wrapper><WorkerScheduleView /></Wrapper>);
        expect(await screen.findByRole("button", { name: /Set Availability/i })).toBeInTheDocument();
    });

    it("opens Set Availability dialog when button is clicked", async () => {
        const user = userEvent.setup();
        render(<Wrapper><WorkerScheduleView /></Wrapper>);
        const btn = await screen.findByRole("button", { name: /Set Availability/i });
        await user.click(btn);
        // Dialog is open — form fields are visible
        expect(await screen.findByLabelText(/Start Time/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/End Time/i)).toBeInTheDocument();
    });

    it("prefills start and end time defaults in dialog", async () => {
        render(<Wrapper><WorkerScheduleView /></Wrapper>);
        const btn = await screen.findByRole("button", { name: /Set Availability/i });
        fireEvent.click(btn);
        const startInput = await screen.findByLabelText(/Start Time/i) as HTMLInputElement;
        const endInput = screen.getByLabelText(/End Time/i) as HTMLInputElement;
        expect(startInput.value).toBe("09:00");
        expect(endInput.value).toBe("17:00");
    });

    it("shows existing schedule details when a schedule exists for the selected date", async () => {
        const today = new Date();
        const pad = (n: number) => String(n).padStart(2, "0");
        const dateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

        const { WorkerScheduleORM } = await import("@/sdk/database/orm/orm_worker_schedule");
        (WorkerScheduleORM.getInstance as any).mockReturnValue({
            getSchedulesByWorkerAndDateRange: vi.fn().mockResolvedValue([
                {
                    id: "sched-1",
                    worker_id: "worker-1",
                    company_id: "company-1",
                    date: dateStr,
                    start_time: "08:00",
                    end_time: "16:00",
                    is_available: true,
                    notes: "Morning shift",
                },
            ]),
            setSchedule: vi.fn(),
            deleteSchedule: vi.fn(),
        });

        render(<Wrapper><WorkerScheduleView /></Wrapper>);
        expect(await screen.findByText("Available")).toBeInTheDocument();
        expect(screen.getByText("08:00 - 16:00")).toBeInTheDocument();
        expect(screen.getByText("Morning shift")).toBeInTheDocument();
    });
});
