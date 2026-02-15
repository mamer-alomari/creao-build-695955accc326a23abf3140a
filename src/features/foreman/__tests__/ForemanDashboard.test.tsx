
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ForemanDashboard } from "@/features/foreman/ForemanDashboard";
import { JobORM, JobStatus } from "@/sdk/database/orm/orm_job";
import { useCreaoAuth } from "@/sdk/core/auth";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// Mocks
vi.mock("@/sdk/database/orm/orm_job", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/sdk/database/orm/orm_job")>();
    return {
        ...actual,
        JobORM: {
            getInstance: vi.fn(() => ({
                getJobsByCompanyId: vi.fn(),
            }))
        }
    };
});

vi.mock("@tanstack/react-query", () => ({
    useQuery: vi.fn(),
}));

vi.mock("@/sdk/core/auth", () => ({
    useCreaoAuth: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
    useNavigate: vi.fn(),
}));

describe("ForemanDashboard", () => {
    const mockNavigate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useNavigate as unknown as Mock).mockReturnValue(mockNavigate);
        (useCreaoAuth as unknown as Mock).mockReturnValue({
            companyId: "comp-1"
        });
    });

    it("renders active jobs", () => {
        (useQuery as unknown as Mock).mockReturnValue({
            isLoading: false,
            data: [{
                id: "job-1",
                customer_name: "Customer A",
                status: 2, // Booked
                pickup_address: "123 St",
                scheduled_date: new Date().toISOString()
            }]
        });

        render(<ForemanDashboard />);
        expect(screen.getByText("Active Jobs (1)")).toBeInTheDocument();
        expect(screen.getByText("Customer A")).toBeInTheDocument();
    });

    it("filters completed jobs", () => {
        (useQuery as unknown as Mock).mockReturnValue({
            isLoading: false,
            data: [{
                id: "job-2",
                customer_name: "Customer B",
                status: 4, // Completed
                scheduled_date: new Date().toISOString()
            }]
        });

        render(<ForemanDashboard />);
        expect(screen.getByText("Active Jobs (0)")).toBeInTheDocument();
        expect(screen.queryByText("Customer B")).not.toBeInTheDocument();
    });
});
