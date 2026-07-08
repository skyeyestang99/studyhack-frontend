import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

const { clerkState, pushMock, signOutMock } = vi.hoisted(() => ({
  clerkState: {
    isSignedIn: false,
    user: null as null | {
      id: string;
      primaryEmailAddress: { emailAddress: string };
      fullName: string;
      firstName: string;
    },
  },
  pushMock: vi.fn(),
  signOutMock: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: clerkState.user,
    isLoaded: true,
  }),
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: clerkState.isSignedIn,
  }),
  useClerk: () => ({
    signOut: signOutMock,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("@/lib/env", () => ({
  env: {
    apiUrl: "http://localhost:8080",
    useMocks: false,
  },
}));

describe("Clerk protected routing", () => {
  beforeEach(() => {
    clerkState.isSignedIn = false;
    clerkState.user = null;
    pushMock.mockReset();
    signOutMock.mockReset();
  });

  it("routes a signed-out Clerk session to login", async () => {
    render(
      <ProtectedRoute>
        <p>Private dashboard</p>
      </ProtectedRoute>,
    );

    expect(screen.queryByText("Private dashboard")).not.toBeInTheDocument();
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login"));
  });

  it("renders a protected route for a signed-in Clerk session", () => {
    clerkState.isSignedIn = true;
    clerkState.user = {
      id: "user-1",
      primaryEmailAddress: { emailAddress: "student@example.edu" },
      fullName: "Demo Student",
      firstName: "Demo",
    };

    render(
      <ProtectedRoute>
        <p>Private dashboard</p>
      </ProtectedRoute>,
    );

    expect(screen.getByText("Private dashboard")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
