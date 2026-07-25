// Sentry browser-side config. Loaded automatically by @sentry/nextjs.
// Empty NEXT_PUBLIC_SENTRY_DSN = no-op (e.g. local dev).
import * as Sentry from "@sentry/nextjs";

const appEnv = process.env.NEXT_PUBLIC_APP_ENV || "local";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: appEnv,
  tracesSampleRate: 0.1,
  // Prefix the issue title with the env so prod vs perf is visible at a
  // glance in the issue list / alert notifications, not just in the
  // "environment" filter.
  beforeSend(event) {
    const label = `[${appEnv.toUpperCase()}]`;
    if (event.exception?.values?.[0] && !event.exception.values[0].value?.startsWith(label)) {
      event.exception.values[0].value = `${label} ${event.exception.values[0].value ?? ""}`;
    }
    if (event.message && !event.message.startsWith(label)) {
      event.message = `${label} ${event.message}`;
    }
    return event;
  },
});
