/**
 * Property 16: AuthContext state round-trip
 * Feature: auth-and-data-model, Property 16: AuthContext state round-trip
 *
 * For any login action that stores a JWT token and user profile, the AuthContext
 * should provide the user as authenticated. On page reload, if a token exists in
 * localStorage, the user should be set as authenticated. On logout, the token
 * should be removed from localStorage and the user profile cleared.
 *
 * **Validates: Requirements 13.1, 13.2, 13.3**
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import * as fc from "fast-check";
import { render } from "@testing-library/react";
import React from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { UserProfile } from "@/types/api";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
}));

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Generators
const alphaNum = fc.constantFrom(
  ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-".split(
    "",
  ),
);
const alpha = fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz".split(""));
const alphaUpper = fc.constantFrom(
  ..."abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
);

const tokenArb = fc.string({ unit: alphaNum, minLength: 10, maxLength: 50 });

const userProfileArb: fc.Arbitrary<UserProfile> = fc.record({
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
    .string({ unit: alphaUpper, minLength: 1, maxLength: 20 })
    .filter((s) => s.trim().length > 0),
  subscriptionTier: fc.constantFrom("FREE" as const, "PREMIUM" as const),
});

// Helper components
function AuthLoginTrigger({
  tokenVal,
  userVal,
  onDone,
}: {
  tokenVal: string;
  userVal: UserProfile;
  onDone: () => void;
}) {
  const { login } = useAuth();
  React.useEffect(() => {
    login(tokenVal, userVal);
    onDone();
  }, []); // eslint-disable-line
  return null;
}

function AuthLogoutTrigger({ onDone }: { onDone: () => void }) {
  const { logout } = useAuth();
  React.useEffect(() => {
    logout();
    onDone();
  }, []); // eslint-disable-line
  return null;
}

function AuthStateReader({
  onState,
}: {
  onState: (s: {
    user: UserProfile | null;
    token: string | null;
    isAuthenticated: boolean;
  }) => void;
}) {
  const { user, token, isAuthenticated } = useAuth();
  React.useEffect(() => {
    onState({ user, token, isAuthenticated });
  });
  return null;
}

describe("Feature: auth-and-data-model, Property 16: AuthContext state round-trip", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("login stores token and user, making isAuthenticated true", () => {
    fc.assert(
      fc.property(tokenArb, userProfileArb, (token, user) => {
        localStorageMock.clear();
        let state: {
          user: UserProfile | null;
          token: string | null;
          isAuthenticated: boolean;
        } | null = null;
        let done = false;

        const { unmount } = render(
          <AuthProvider>
            <AuthLoginTrigger
              tokenVal={token}
              userVal={user}
              onDone={() => {
                done = true;
              }}
            />
            <AuthStateReader
              onState={(s) => {
                if (done) state = s;
              }}
            />
          </AuthProvider>,
        );

        expect(state).not.toBeNull();
        expect(state!.isAuthenticated).toBe(true);
        expect(state!.token).toBe(token);
        expect(state!.user).toEqual(user);
        expect(localStorageMock.setItem).toHaveBeenCalledWith("token", token);
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          "user",
          JSON.stringify(user),
        );
        unmount();
      }),
      { numRuns: 100 },
    );
  });

  it("on mount with token in localStorage, user is authenticated", () => {
    fc.assert(
      fc.property(tokenArb, userProfileArb, (token, user) => {
        localStorageMock.clear();
        localStorageMock.setItem("token", token);
        localStorageMock.setItem("user", JSON.stringify(user));
        vi.clearAllMocks();

        let state: {
          user: UserProfile | null;
          token: string | null;
          isAuthenticated: boolean;
        } | null = null;

        const { unmount } = render(
          <AuthProvider>
            <AuthStateReader
              onState={(s) => {
                state = s;
              }}
            />
          </AuthProvider>,
        );

        expect(state).not.toBeNull();
        expect(state!.isAuthenticated).toBe(true);
        expect(state!.token).toBe(token);
        expect(state!.user).toEqual(user);
        unmount();
      }),
      { numRuns: 100 },
    );
  });

  it("logout clears token from localStorage and resets user", () => {
    fc.assert(
      fc.property(tokenArb, userProfileArb, (token, user) => {
        localStorageMock.clear();
        localStorageMock.setItem("token", token);
        localStorageMock.setItem("user", JSON.stringify(user));
        vi.clearAllMocks();

        let state: {
          user: UserProfile | null;
          token: string | null;
          isAuthenticated: boolean;
        } | null = null;
        let done = false;

        const { unmount } = render(
          <AuthProvider>
            <AuthLogoutTrigger
              onDone={() => {
                done = true;
              }}
            />
            <AuthStateReader
              onState={(s) => {
                if (done) state = s;
              }}
            />
          </AuthProvider>,
        );

        expect(state).not.toBeNull();
        expect(state!.isAuthenticated).toBe(false);
        expect(state!.token).toBeNull();
        expect(state!.user).toBeNull();
        expect(localStorageMock.removeItem).toHaveBeenCalledWith("token");
        expect(localStorageMock.removeItem).toHaveBeenCalledWith("user");
        unmount();
      }),
      { numRuns: 100 },
    );
  });
});
