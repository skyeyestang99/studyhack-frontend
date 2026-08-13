import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  LimitReachedCard,
  ServiceDegradedCard,
  QuotaRefusalCard,
  UsageMeter,
} from "@/components/usage/QuotaCards";
import { readQuotaRefusal } from "@/lib/quota";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const exceeded = {
  kind: "exceeded" as const,
  tier: "FREE" as const,
  limit: 10,
  used: 10,
  resetsAt: new Date(Date.now() + 6 * 3600_000).toISOString(),
};

/**
 * The backend separates QUOTA_EXCEEDED from QUOTA_UNAVAILABLE so an outage is not
 * indistinguishable from a paywall. These tests exist so the UI cannot quietly
 * collapse that distinction back into one generic error.
 */
describe("quota states", () => {
  it("a limit says it is a limit, and when it lifts", () => {
    render(<LimitReachedCard refusal={exceeded} kindLabel="Quick Help questions" />);
    expect(screen.getByText(/used all 10 of today/i)).toBeInTheDocument();
    expect(screen.getByText(/resets in about 6 hours/i)).toBeInTheDocument();
    // Never blames the service for a limit.
    expect(screen.queryByText(/trouble on our end/i)).toBeNull();
  });

  it("an outage says it is OURS, and that nothing was consumed", () => {
    render(<ServiceDegradedCard />);
    expect(screen.getByText(/trouble on our end/i)).toBeInTheDocument();
    expect(screen.getByText(/haven't used up anything/i)).toBeInTheDocument();
    // Must not imply a limit or offer an upgrade to fix our problem.
    expect(screen.queryByText(/resets/i)).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("the two states are not interchangeable in the DOM", () => {
    const { container: limit } = render(
      <LimitReachedCard refusal={exceeded} kindLabel="Quick Help questions" />,
    );
    const { container: outage } = render(<ServiceDegradedCard />);
    // Different roles: a limit is informational, an outage is an alert.
    expect(limit.querySelector('[role="status"]')).not.toBeNull();
    expect(outage.querySelector('[role="alert"]')).not.toBeNull();
    // And they don't share a colour treatment.
    expect(limit.innerHTML).toContain("brand");
    expect(outage.innerHTML).toContain("destructive");
  });

  it("the wrapper routes each reason to its own card", () => {
    const { rerender } = render(
      <QuotaRefusalCard refusal={exceeded} kindLabel="Quick Help questions" />,
    );
    expect(screen.getByText(/used all 10 of today/i)).toBeInTheDocument();

    rerender(
      <QuotaRefusalCard refusal={{ kind: "unavailable" }} kindLabel="Quick Help questions" />,
    );
    expect(screen.getByText(/trouble on our end/i)).toBeInTheDocument();
    expect(screen.queryByText(/used all 10 of today/i)).toBeNull();
  });

  it("the meter stays hidden until it is informative", () => {
    // Always-on meters get ignored, and turn a generous limit into a visible ceiling.
    const { container: quiet } = render(<UsageMeter used={3} limit={200} />);
    expect(quiet).toBeEmptyDOMElement();

    render(<UsageMeter used={18} limit={20} />);
    expect(screen.getByText("18 of 20 today")).toBeInTheDocument();
  });

  it("parses each refusal code, and ignores unrelated failures", async () => {
    const mk = (status: number, body: unknown) =>
      ({ status, json: async () => body }) as Response;

    expect(
      await readQuotaRefusal(
        mk(429, { code: "QUOTA_EXCEEDED", tier: "FREE", limit: 10, used: 10, resetsAt: "x" }),
      ),
    ).toMatchObject({ kind: "exceeded", limit: 10 });

    expect(await readQuotaRefusal(mk(503, { code: "QUOTA_UNAVAILABLE" }))).toEqual({
      kind: "unavailable",
    });

    // A 500 or a 429 from something else must keep its normal error handling.
    expect(await readQuotaRefusal(mk(500, { message: "boom" }))).toBeNull();
    expect(await readQuotaRefusal(mk(429, { message: "generic rate limit" }))).toBeNull();
  });
});
