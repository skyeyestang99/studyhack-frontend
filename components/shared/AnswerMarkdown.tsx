"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";

/**
 * The one place AI answers are rendered.
 *
 * Every answer surface in the product streams the same thing: Markdown with LaTeX
 * math. Course chat rendered it correctly while Quick Help printed it into a
 * plain <div>, so the zero-setup first impression — the single screen the whole
 * activation argument depends on — showed literal `**Approach**` and
 * `$\frac{dy}{dx}$` instead of formatted math.
 *
 * Keeping this in one component means math, tables, and code rendering can only
 * ever be right or wrong everywhere at once, rather than silently diverging as
 * new answer surfaces get added.
 */
export function AnswerMarkdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // prose-headings tuned down: model answers use bold section labels
        // ("**Approach**"), not document headings, so default heading sizes are
        // disproportionate inside a chat bubble.
        "prose prose-sm max-w-none break-words",
        "prose-headings:mb-1 prose-headings:mt-3 prose-headings:text-base",
        "prose-p:my-2 prose-li:my-0.5 prose-pre:my-2",
        "prose-code:before:content-none prose-code:after:content-none",
        className,
      )}
    >
      <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {children}
      </Markdown>
    </div>
  );
}
