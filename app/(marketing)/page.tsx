"use client";

import Link from "next/link";
import { ArrowRight, FileText, MessageCircleQuestion, Target } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { GroundedAnswerDemo } from "@/components/marketing/GroundedAnswerDemo";

/**
 * Landing page.
 *
 * This was a backend health-check card with two dead buttons — the first screen
 * every invitee saw, promising "AI-Powered Homework Guidance" above a panel that
 * could read "Unable to connect to the backend." The health check moved to /debug,
 * where it is actually useful.
 *
 * The argument is ordered the way a sceptical student would test it: what makes
 * this different from the chatbot they already use (a cited answer from their own
 * class), then what it costs them to find out (nothing — the first question needs
 * no setup), then what it can't do. Claiming less than the product delivers is
 * cheaper than losing trust in week one of a beta.
 */
export default function Home() {
  const { isAuthenticated } = useAuth();

  // Signed-in visitors are not prospects; send them where the product is.
  const primaryHref = isAuthenticated ? "/dashboard" : "/register";
  const primaryLabel = isAuthenticated ? "Go to my dashboard" : "Start free — no setup";

  return (
    <div className="flex flex-col">
      <section className="mx-auto w-full max-w-6xl px-4 pb-8 pt-14 sm:px-6 lg:px-8 lg:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand-foreground">
              <Target className="h-3.5 w-3.5" aria-hidden="true" />
              Built around your professor, not just your subject
            </span>

            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Homework help that knows your class
            </h1>

            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Ask anything and get worked guidance in seconds. Add your course, and
              answers start citing{" "}
              <span className="font-medium text-foreground">your own materials</span> —
              page by page — plus what your professor has actually tested before.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href={primaryHref}>
                  {primaryLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              {/* Was a dead "Learn more". An in-page anchor to the actual example is
                  a real destination, and the example is the argument. */}
              <Button asChild size="lg" variant="outline">
                <a href="#example">See a real answer</a>
              </Button>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">
              Free during beta. Your first question needs no course, no uploads.
            </p>
          </div>

          <div id="example" className="lg:pl-4">
            <GroundedAnswerDemo />
            <p className="mt-2 text-center text-xs text-muted-foreground">
              A real answer from a seeded MATH 20C course, with its citations.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              Icon: MessageCircleQuestion,
              title: "Start in one question",
              body: "No course setup, no uploads. Type or photograph the problem and get a worked explanation.",
            },
            {
              Icon: FileText,
              title: "Answers from your material",
              body: "Upload lecture notes and problem sets, and every claim links to the page it came from — so you can check it.",
            },
            {
              Icon: Target,
              title: "What your professor tests",
              body: "Past exams and quizzes from your course, read together to show which topics they keep returning to.",
            },
          ].map(({ Icon, title, body }) => (
            <div key={title} className="rounded-2xl border bg-card p-5 shadow-sm">
              <Icon className="h-5 w-5 text-brand" aria-hidden="true" />
              <h2 className="mt-3 font-semibold">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Setting expectations beats a surprise in week one. */}
      <section className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl border bg-muted/30 p-5">
          <h2 className="font-semibold">What it won&apos;t do</h2>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
            <li>
              · It won&apos;t hand you answers to submit. It works through problems so
              you can do the next one yourself.
            </li>
            <li>
              · It won&apos;t invent a source. With nothing uploaded, it says the answer
              came from general knowledge instead of implying it came from your class.
            </li>
            <li>
              · It can&apos;t predict your exam. It reports what past assessments
              emphasised, and tells you when that&apos;s too little evidence to trust.
            </li>
          </ul>
        </div>

        <div className="mt-8 text-center">
          <Button asChild size="lg">
            <Link href={primaryHref}>
              {primaryLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
