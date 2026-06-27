/**
 * Property 18: Protected route redirects unauthenticated users
 * Feature: auth-and-data-model, Property 18: Protected route redirects unauthenticated users
 *
 * For any protected route, when the AuthContext indicates no authenticated user,
 * the ProtectedRoute component should redirect to /login without rendering child content.
 *
 * **Validates: Requirements 14.1, 14.2**
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import * as fc from "fast-check";
import { render } from "@testing-library/react";
import React from "react";

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
  usePathname: () => "/dashboard",
}));

let mockIsAuthenticated = false;
let mockUser: {
  id: string;
  email: string;
  name: string;
  subscriptionTier: "FREE" | "PREMIUM";
} | null = null;
let mockToken: string | null = null;

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    user: mockUser,
    token: mockToken,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Generators
const alpha = fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz".split(""));
const alphaNum = fc.constantFrom(
  ..."abcdefghijklmnopqrstuvwxyz0123456789._-".split(""),
);
const alphaUpper = fc.constantFrom(
  ..."abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split(
    "",
  ),
);

const childTextArb = fc
  .string({ unit: alphaUpper, minLength: 5, maxLength: 30 })
  .filter((s) => s.trim().length > 0);
const tokenArb = fc.string({ unit: alphaNum, minLength: 10, maxLength: 50 });
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
    .map(([l, d, t]) => `${l}@${d}.${t}`),
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

describe("Feature: auth-and-data-model, Property 18: Protected route redirects unauthenticated users", () => {
  beforeEach(() => {
    pushMock.mockClear();
    mockIsAuthenticated = false;
    mockUser = null;
    mockToken = null;
  });

  it("redirects to /login and does not render children when unauthenticated", () => {
    fc.assert(
      fc.property(childTextArb, (childText) => {
        pushMock.mockClear();
        mockIsAuthenticated = false;
        mockUser = null;
        mockToken = null;

        const { container, unmount } = render(
          <ProtectedRoute>
            <div data-testid="protected-content">{childText}</div>
          </ProtectedRoute>,
        );

        expect(
          container.querySelector('[data-testid="protected-content"]'),
        ).toBeNull();
        expect(pushMock).toHaveBeenCalledWith("/login");
        unmount();
      }),
      { numRuns: 100 },
    );
  });

  it("renders children when authenticated", () => {
    fc.assert(
      fc.property(
        childTextArb,
        tokenArb,
        userProfileArb,
        (childText, token, user) => {
          pushMock.mockClear();
          mockIsAuthenticated = true;
          mockUser = user;
          mockToken = token;

          const { container, unmount } = render(
            <ProtectedRoute>
              <div data-testid="protected-content">{childText}</div>
            </ProtectedRoute>,
          );

          const el = container.querySelector(
            '[data-testid="protected-content"]',
          );
          expect(el).not.toBeNull();
          expect(el!.textContent).toBe(childText);
          expect(pushMock).not.toHaveBeenCalled();
          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });
});
