/**
 * Property 19: Authenticated users redirected from auth pages
 * Feature: auth-and-data-model, Property 19: Authenticated users redirected from auth pages
 *
 * For any authenticated user navigating to /login or /register, the system
 * should redirect them to semester setup until onboarding is complete.
 *
 * **Validates: Requirements 14.4**
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import * as fc from "fast-check";
import { render } from "@testing-library/react";
import React from "react";

// Track router.push calls
const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
}));

// Mock env
vi.mock("@/lib/env", () => ({
  env: { apiUrl: "http://localhost:8080" },
}));

// Control auth state via mock
let mockIsAuthenticated = false;
let mockUser: {
  id: string;
  email: string;
  name: string;
  subscriptionTier: "FREE" | "PREMIUM";
} | null = null;
let mockToken: string | null = null;
const mockLogin = vi.fn();
const mockLogout = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    user: mockUser,
    token: mockToken,
    login: mockLogin,
    logout: mockLogout,
  }),
}));

// Mock apiClient to prevent actual network calls
vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import LoginPage from "@/app/login/page";
import RegisterPage from "@/app/register/page";

// Generators
const alpha = fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz".split(""));

const tokenArb = fc.string({
  unit: fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789._-".split("")),
  minLength: 10,
  maxLength: 50,
});

const userProfileArb = fc.record({
  id: fc.uuid(),
  email: fc
    .tuple(
      fc.string({
        unit: fc.constantFrom(
          ..."abcdefghijklmnopqrstuvwxyz0123456789".split(""),
        ),
        minLength: 1,
        maxLength: 8,
      }),
      fc.string({ unit: alpha, minLength: 1, maxLength: 6 }),
      fc.string({ unit: alpha, minLength: 2, maxLength: 4 }),
    )
    .map(([local, domain, tld]) => `${local}@${domain}.${tld}`),
  name: fc
    .string({
      unit: fc.constantFrom(
        ..."abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
      ),
      minLength: 1,
      maxLength: 20,
    })
    .filter((s) => s.trim().length > 0),
  subscriptionTier: fc.constantFrom("FREE" as const, "PREMIUM" as const),
});

describe("Feature: auth-and-data-model, Property 19: Authenticated users redirected from auth pages", () => {
  beforeEach(() => {
    pushMock.mockClear();
    mockLogin.mockClear();
    mockLogout.mockClear();
    mockIsAuthenticated = false;
    mockUser = null;
    mockToken = null;
    localStorage.clear();
  });

  it("redirects authenticated users from /login to /onboarding before setup", () => {
    fc.assert(
      fc.property(tokenArb, userProfileArb, (token, user) => {
        pushMock.mockClear();
        mockIsAuthenticated = true;
        mockUser = user;
        mockToken = token;

        const { unmount } = render(<LoginPage />);

        expect(pushMock).toHaveBeenCalledWith("/onboarding");

        unmount();
      }),
      { numRuns: 100 },
    );
  });

  it("redirects authenticated users from /register to /onboarding before setup", () => {
    fc.assert(
      fc.property(tokenArb, userProfileArb, (token, user) => {
        pushMock.mockClear();
        mockIsAuthenticated = true;
        mockUser = user;
        mockToken = token;

        const { unmount } = render(<RegisterPage />);

        expect(pushMock).toHaveBeenCalledWith("/onboarding");

        unmount();
      }),
      { numRuns: 100 },
    );
  });

  it("redirects authenticated users to /dashboard after setup is complete", () => {
    fc.assert(
      fc.property(tokenArb, userProfileArb, (token, user) => {
        pushMock.mockClear();
        mockIsAuthenticated = true;
        mockUser = user;
        mockToken = token;
        localStorage.setItem(`studyai:onboarding-complete:${user.id}`, "true");

        const { unmount } = render(<LoginPage />);

        expect(pushMock).toHaveBeenCalledWith("/dashboard");

        unmount();
      }),
      { numRuns: 100 },
    );
  });

  it("does not redirect unauthenticated users from /login", () => {
    pushMock.mockClear();
    mockIsAuthenticated = false;
    mockUser = null;
    mockToken = null;

    const { unmount } = render(<LoginPage />);

    expect(pushMock).not.toHaveBeenCalled();

    unmount();
  });

  it("does not redirect unauthenticated users from /register", () => {
    pushMock.mockClear();
    mockIsAuthenticated = false;
    mockUser = null;
    mockToken = null;

    const { unmount } = render(<RegisterPage />);

    expect(pushMock).not.toHaveBeenCalled();

    unmount();
  });
});
