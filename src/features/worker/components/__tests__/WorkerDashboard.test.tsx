
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WorkerDashboard } from "@/features/worker/components/WorkerDashboard";
import { JobWorkerAssignmentORM } from "@/sdk/database/orm/orm_job_worker_assignment";
import { JobORM, JobStatus } from "@/sdk/database/orm/orm_job";
import { useCreaoAuth } from "@/sdk/core/auth";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';

// Mocks
vi.mock("@/sdk/database/orm/orm_job_worker_assignment", () => ({
    JobWorkerAssignmentORM: {
        getInstance: vi.fn(() => ({
            getJobWorkerAssignmentByWorkerId: vi.fn(),
        }))
    }
}));

vi.mock("@/sdk/database/orm/orm_job", () => ({
    JobORM: {
        getInstance: vi.fn(() => ({
            getJobByIDs: vi.fn(),
        }))
    },
    JobStatus: {
        Booked: "BOOKED",
        Completed: "COMPLETED"
    }
}));

vi.mock("@tanstack/react-query", () => ({
    useQuery: vi.fn(),
}));

vi.mock("@/sdk/core/auth", () => ({
    useCreaoAuth: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
    useNavigate: vi.fn(),
}));

describe("WorkerDashboard", () => {
    const mockNavigate = vi.fn();

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));

        vi.clearAllMocks();
        (useNavigate as unknown as Mock).mockReturnValue(mockNavigate);
        (useCreaoAuth as unknown as Mock).mockReturnValue({
            user: { uid: "worker-1" },
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("shows loading state", () => {
        (useQuery as unknown as Mock).mockReturnValue({ isLoading: true, data: [] });
        render(<WorkerDashboard />);
        expect(screen.getByText("Loading schedule...")).toBeInTheDocument();
    });

    it("shows 'No jobs' when empty", () => {
        (useQuery as unknown as Mock).mockReturnValue({ isLoading: false, data: [] });
        render(<WorkerDashboard />);
        expect(screen.getByText("No jobs scheduled for today.")).toBeInTheDocument();
    });

    it("renders todays jobs", () => {
        const today = new Date();
        (useQuery as unknown as Mock).mockReturnValue({
            isLoading: false,
            data: [{
                id: "job-123",
                customer_name: "John Doe",
                pickup_address: "123 St",
                dropoff_address: "456 Av",
                status: "BOOKED",
                scheduled_date: today.toISOString()
            }]
        });

        render(<WorkerDashboard />);
        expect(screen.getByText("John Doe")).toBeInTheDocument();
        expect(screen.getByText("Job #job-12")).toBeInTheDocument();
        expect(screen.getByText("Start Job")).toBeInTheDocument();
    });

    it("navigates to job execution on start", () => {
        const today = new Date();
        (useQuery as unknown as Mock).mockReturnValue({
            isLoading: false,
            data: [{
                id: "job-123",
                customer_name: "John Doe",
                status: "BOOKED",
                scheduled_date: today.toISOString()
            }]
        });

        render(<WorkerDashboard />);
        const btn = screen.getByText("Start Job");
        fireEvent.click(btn);
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/worker/jobs/job-123" });
    });
});
