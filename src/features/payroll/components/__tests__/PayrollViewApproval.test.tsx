
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PayrollView } from "../PayrollView";
import { PayrollRecordStatus } from "@/sdk/database/orm/orm_payroll_record";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";

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

// Mock PayrollORM
const mockSetPayrollRecordById = vi.fn();
vi.mock("@/sdk/database/orm/orm_payroll_record", async () => {
    const actual = await vi.importActual("@/sdk/database/orm/orm_payroll_record");
    return {
        ...actual,
        PayrollRecordORM: {
            getInstance: () => ({
                getPayrollRecordByIDs: vi.fn().mockResolvedValue([{ id: "payroll-1", status: PayrollRecordStatus.Draft }]),
                setPayrollRecordById: mockSetPayrollRecordById,
            }),
        },
    };
});

describe("PayrollView Approval", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("shows Approve button for Draft records and calls mutation", async () => {
        const user = userEvent.setup();
        const mockRecords = [{
            id: "payroll-1",
            worker_id: "worker-1",
            pay_period_start: "1000",
            pay_period_end: "2000",
            hourly_wage: 20,
            hours_worked: 10,
            total_pay: 200,
            status: PayrollRecordStatus.Draft,
            company_id: "company-1",
            data_creator: "user-1",
            data_updater: "user-1",
            create_time: "now",
            update_time: "now",
        }];

        render(
            <Wrapper>
                <PayrollView
                    payrollRecords={mockRecords}
                    workers={[{ id: "worker-1", full_name: "John Doe" } as any]}
                    companyId="company-1"
                />
            </Wrapper>
        );

        // Check if Approve button exists
        const approveBtn = screen.getByRole("button", { name: "Approve" });
        expect(approveBtn).toBeInTheDocument();

        // Click it
        await user.click(approveBtn);

        // Verify mutation
        await waitFor(() => {
            expect(mockSetPayrollRecordById).toHaveBeenCalledWith("payroll-1", expect.objectContaining({
                status: PayrollRecordStatus.Approved
            }));
        });
    });

    it("shows Approve button for Unspecified records (legacy data fix)", async () => {
        const mockRecords = [{
            id: "payroll-2",
            worker_id: "worker-1",
            pay_period_start: "1000",
            pay_period_end: "2000",
            hourly_wage: 20,
            hours_worked: 10,
            total_pay: 200,
            status: PayrollRecordStatus.Unspecified, // Legacy/Error case
            company_id: "company-1",
            data_creator: "user-1",
            data_updater: "user-1",
            create_time: "now",
            update_time: "now",
        }];

        render(
            <Wrapper>
                <PayrollView
                    payrollRecords={mockRecords}
                    workers={[{ id: "worker-1", full_name: "John Doe" } as any]}
                    companyId="company-1"
                />
            </Wrapper>
        );

        expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    });
});
