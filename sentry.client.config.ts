// Sentry browser-side config. Loaded automatically by @sentry/nextjs.
// Empty NEXT_PUBLIC_SENTRY_DSN = no-op (e.g. local dev).
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV || "local",
  tracesSampleRate: 0.1,
});
