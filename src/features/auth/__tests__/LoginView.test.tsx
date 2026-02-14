
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { LoginView } from "../LoginView";
// Mock Firebase Auth
import * as firebaseAuth from "firebase/auth";

// Mock dependencies
vi.mock("@/lib/firebase", () => ({
    auth: {
        currentUser: null,
    },
}));

vi.mock("@tanstack/react-router", () => ({
    useNavigate: () => vi.fn(),
    createRouter: vi.fn(),
}));

vi.mock("firebase/auth", async () => {
    const actual = await vi.importActual("firebase/auth");
    return {
        ...actual,
        signInWithEmailAndPassword: vi.fn(),
        createUserWithEmailAndPassword: vi.fn(),
        signInWithPopup: vi.fn(),
        GoogleAuthProvider: vi.fn(),
        getAuth: vi.fn(),
    };
});

describe("LoginView", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders login form by default", () => {
        render(<LoginView />);

        expect(screen.getByText("Welcome")).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /login/i })).toHaveAttribute("data-state", "active");
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });

    it("switches to signup form", async () => {
        const user = userEvent.setup();
        render(<LoginView />);

        const signupTab = screen.getByRole("tab", { name: /sign up/i });
        await user.click(signupTab);

        await waitFor(() => {
            expect(signupTab).toHaveAttribute("data-state", "active");
            expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
        });
    });

    it("calls signInWithEmailAndPassword on login submit", async () => {
        const user = userEvent.setup();
        render(<LoginView />);

        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/password/i);

        await user.type(emailInput, "test@example.com");
        await user.type(passwordInput, "password123");

        const submitButton = screen.getByRole("button", { name: /sign in/i });
        await user.click(submitButton);

        await waitFor(() => {
            expect(firebaseAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(
                expect.anything(),
                "test@example.com",
                "password123"
            );
        });
    });

    it("calls createUserWithEmailAndPassword on signup submit", async () => {
        const user = userEvent.setup();
        render(<LoginView />);

        const signupTab = screen.getByRole("tab", { name: /sign up/i });
        await user.click(signupTab);

        // Wait for tab switch
        await waitFor(() => {
            expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
        });

        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/password/i);

        await user.type(emailInput, "new@example.com");
        await user.type(passwordInput, "password123");

        const submitButton = screen.getByRole("button", { name: /create account/i });
        await user.click(submitButton);

        await waitFor(() => {
            expect(firebaseAuth.createUserWithEmailAndPassword).toHaveBeenCalledWith(
                expect.anything(),
                "new@example.com",
                "password123"
            );
        });
    });

    it("displays error message on auth failure", async () => {
        const user = userEvent.setup();
        const errorMessage = "Invalid credentials";
        vi.mocked(firebaseAuth.signInWithEmailAndPassword).mockRejectedValueOnce(new Error(errorMessage));

        render(<LoginView />);

        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/password/i);

        await user.type(emailInput, "fail@example.com");
        await user.type(passwordInput, "wrongpass");

        const submitButton = screen.getByRole("button", { name: /sign in/i });
        await user.click(submitButton);

        expect(await screen.findByText(errorMessage)).toBeInTheDocument();
    });
});
