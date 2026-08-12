import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnswerMarkdown } from "@/components/shared/AnswerMarkdown";

/**
 * Quick Help shipped rendering answers into a plain <div>, so students saw
 * literal `**Approach**` and `$\frac{dy}{dx}$` on the product's first screen.
 * These lock in that AI answers are rendered, not printed.
 */
describe("AnswerMarkdown", () => {
  it("renders bold markdown as an element, not literal asterisks", () => {
    render(<AnswerMarkdown>{"**Approach** — do this"}</AnswerMarkdown>);
    expect(screen.getByText("Approach").tagName.toLowerCase()).toBe("strong");
    expect(screen.queryByText(/\*\*Approach\*\*/)).toBeNull();
  });

  it("renders inline LaTeX through KaTeX instead of showing dollar signs", () => {
    const { container } = render(
      <AnswerMarkdown>{"The rate is $\\frac{dy}{dx}$ here"}</AnswerMarkdown>,
    );
    expect(container.querySelector(".katex")).not.toBeNull();
    expect(container.textContent).not.toContain("$\\frac");
  });

  it("renders GFM tables", () => {
    render(
      <AnswerMarkdown>{"| a | b |\n| - | - |\n| 1 | 2 |"}</AnswerMarkdown>,
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});
