import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: false, user: null }),
}));

import Home from "@/app/(marketing)/page";

/**
 * The landing page was a backend health-check card with two dead buttons — the
 * first screen every invitee saw. These lock in that it sells the product and that
 * both CTAs go somewhere.
 */
describe("landing page", () => {
  it("leads with the value proposition, not a system status card", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { level: 1, name: /knows your class/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/system status/i)).toBeNull();
    expect(screen.queryByText(/unable to connect to the backend/i)).toBeNull();
  });

  it("has no dead CTAs — both primary actions have real destinations", () => {
    render(<Home />);
    const start = screen.getAllByRole("link", { name: /start free/i })[0];
    expect(start).toHaveAttribute("href", "/register");
    // Replaces the old dead "Learn more": anchors to the worked example on-page.
    expect(screen.getByRole("link", { name: /see a real answer/i })).toHaveAttribute(
      "href",
      "#example",
    );
  });

  it("shows a grounded answer with citations, since that is the differentiator", () => {
    render(<Home />);
    expect(screen.getByText(/from your materials/i)).toBeInTheDocument();
    expect(screen.getByText("Quiz 5 p.3")).toBeInTheDocument();
    expect(screen.getByText(/what this professor tests/i)).toBeInTheDocument();
  });

  it("states limitations rather than overselling", () => {
    render(<Home />);
    expect(screen.getByText(/won't hand you answers to submit/i)).toBeInTheDocument();
    expect(screen.getByText(/can't predict your exam/i)).toBeInTheDocument();
  });
});
