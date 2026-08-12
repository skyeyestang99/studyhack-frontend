import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SetupProgress } from "@/components/dashboard/SetupProgress";

describe("SetupProgress", () => {
  const base = {
    askedQuestion: false,
    courseCount: 0,
    materialCount: 0,
    assessmentCount: 0,
  };

  it("reports progress derived from real state", () => {
    render(<SetupProgress {...base} askedQuestion courseCount={1} />);
    expect(screen.getByText("2 of 4")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
  });

  it("hides itself once every step is done, so it can't become permanent clutter", () => {
    const { container } = render(
      <SetupProgress
        askedQuestion
        courseCount={1}
        materialCount={3}
        assessmentCount={2}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("links only the next incomplete step, not all of them", () => {
    render(<SetupProgress {...base} askedQuestion firstCourseId="c1" />);
    // Step 2 ("Add your course") is next; step 3/4 must not compete for attention.
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/onboarding");
  });
});
