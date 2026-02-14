
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TeamManager } from "@/features/team/TeamManager";
import { WorkerORM } from "@/sdk/database/orm/orm_worker";
import { InvitationORM } from "@/sdk/database/orm/orm_invitation";
import { useCreaoAuth } from "@/sdk/core/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// Mocks
vi.mock("@/sdk/database/orm/orm_worker", () => ({
    WorkerORM: {
        getInstance: vi.fn(() => ({
            getWorkerByCompanyId: vi.fn(),
        }))
    }
}));

vi.mock("@/sdk/database/orm/orm_invitation", () => ({
    InvitationORM: {
        getInstance: vi.fn(() => ({
            getPendingInvitationsByCompany: vi.fn(),
            createInvitation: vi.fn(),
        }))
    }
}));

vi.mock("@tanstack/react-query", () => ({
    useQuery: vi.fn(),
    useMutation: vi.fn(),
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock("@/sdk/core/auth", () => ({
    useCreaoAuth: vi.fn(),
}));

describe("TeamManager", () => {
    const mockCreateInvite = vi.fn();
    const mockMutate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useCreaoAuth as unknown as Mock).mockReturnValue({
            user: { uid: "manager-1" },
            companyId: "comp-1"
        });
        (useMutation as unknown as Mock).mockReturnValue({
            mutate: mockMutate,
            isPending: false
        });
    });

    it("renders worker list", () => {
        // First usage of useQuery is for workers, second for invitations
        (useQuery as unknown as Mock).mockReturnValueOnce({
            data: [{ id: "w1", name: "Worker One", role: "worker" }]
        }).mockReturnValueOnce({
            data: []
        });

        render(<TeamManager />);
        expect(screen.getByText("Active Workers")).toBeInTheDocument();
        expect(screen.getByText("Worker One")).toBeInTheDocument();
    });

    it("opens invite dialog", () => {
        (useQuery as unknown as Mock).mockReturnValue({ data: [] });

        render(<TeamManager />);
        const inviteBtn = screen.getByText("Invite Worker");
        fireEvent.click(inviteBtn);

        expect(screen.getByText("Invite New Worker")).toBeInTheDocument();
    });
});
