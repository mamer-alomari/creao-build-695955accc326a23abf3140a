import { describe, expect, it, vi, beforeEach } from "vitest";
import { sendWorkerInvitation } from "../invitation";
import type { WorkerModel } from "@/sdk/database/orm/orm_worker";
import { WorkerRole, WorkerStatus } from "@/sdk/database/orm/orm_worker";

// Mock sonner toast
const mockSuccess = vi.fn();
vi.mock("sonner", () => ({
    toast: {
        success: (...args: any[]) => mockSuccess(...args),
    },
}));

const baseWorker = (overrides: Partial<WorkerModel> = {}): WorkerModel => ({
    id: "worker-1",
    full_name: "Jane Smith",
    role: WorkerRole.Mover,
    status: WorkerStatus.Active,
    company_id: "company-1",
    data_creator: "user-1",
    data_updater: "user-1",
    create_time: "1234567890",
    update_time: "1234567890",
    ...overrides,
});

describe("sendWorkerInvitation", () => {
    beforeEach(() => {
        mockSuccess.mockClear();
    });

    it("calls toast.success with the worker name", async () => {
        await sendWorkerInvitation(baseWorker());
        expect(mockSuccess).toHaveBeenCalledOnce();
        expect(mockSuccess.mock.calls[0][0]).toContain("Jane Smith");
    });

    it("includes email in description when worker has email", async () => {
        await sendWorkerInvitation(baseWorker({ email: "jane@example.com" }));
        const opts = mockSuccess.mock.calls[0][1];
        expect(opts?.description).toContain("jane@example.com");
    });

    it("includes phone_number in description when worker has no email", async () => {
        await sendWorkerInvitation(baseWorker({ email: undefined, phone_number: "+15551234567" }));
        const opts = mockSuccess.mock.calls[0][1];
        expect(opts?.description).toContain("+15551234567");
    });

    it("falls back to 'their contact info' when neither email nor phone is provided", async () => {
        await sendWorkerInvitation(baseWorker({ email: undefined, phone_number: undefined }));
        const opts = mockSuccess.mock.calls[0][1];
        expect(opts?.description).toContain("their contact info");
    });

    it("returns void (no throw)", async () => {
        await expect(sendWorkerInvitation(baseWorker())).resolves.toBeUndefined();
    });
});
