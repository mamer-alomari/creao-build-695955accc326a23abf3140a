import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PayrollView } from "../PayrollView";
import { PayrollRecordStatus } from "@/sdk/database/orm/orm_payroll_record";
import { WorkerRole, WorkerStatus } from "@/sdk/database/orm/orm_worker";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";

const queryClient = new QueryClient();

const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const mockWorkers = [
    {
        id: "worker-1",
        full_name: "John Smith",
        role: WorkerRole.Mover,
        status: WorkerStatus.Active,
        company_id: "company-1",
        data_creator: "user-1",
        data_updater: "user-1",
        create_time: "1234567890",
        update_time: "1234567890",
    }
];

const mockPayrollRecords = [
    {
        id: "payroll-1",
        worker_id: "worker-1",
        pay_period_start: (Date.now() / 1000).toString(),
        pay_period_end: (Date.now() / 1000).toString(),
        hourly_wage: 20,
        hours_worked: 40,
        total_pay: 800,
        status: PayrollRecordStatus.Draft,
        company_id: "company-1",
        data_creator: "user-1",
        data_updater: "user-1",
        create_time: "1234567890",
        update_time: "1234567890",
    }
];

describe("PayrollView", () => {
    it("renders payroll records list correctly", () => {
        render(
            <Wrapper>
                <PayrollView
                    payrollRecords={mockPayrollRecords}
                    workers={mockWorkers}
                    companyId="company-1"
                />
            </Wrapper>
        );

        expect(screen.getByText("Payroll Management")).toBeInTheDocument();
        expect(screen.getByText("John Smith")).toBeInTheDocument();
        expect(screen.getByText("$800.00")).toBeInTheDocument();
        expect(screen.getByText("Draft")).toBeInTheDocument();
    });

    it("opens create payroll dialog", () => {
        render(
            <Wrapper>
                <PayrollView
                    payrollRecords={[]}
                    workers={mockWorkers}
                    companyId="company-1"
                />
            </Wrapper>
        );

        fireEvent.click(screen.getAllByRole("button", { name: "New Payroll Record" })[0]);

        expect(screen.getByRole("heading", { name: "Create Payroll Record" })).toBeInTheDocument();
        expect(screen.getByText("Worker")).toBeInTheDocument();
    });

    it("shows empty state when no records", () => {
        render(
            <Wrapper>
                <PayrollView
                    payrollRecords={[]}
                    workers={mockWorkers}
                    companyId="company-1"
                />
            </Wrapper>
        );

        expect(screen.getByText("No payroll records yet. Create your first payroll record to get started.")).toBeInTheDocument();
    });
});
