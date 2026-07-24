// Sentry server-side (Node runtime) config. Loaded automatically by @sentry/nextjs.
// Empty SENTRY_DSN = no-op (e.g. local dev). Falls back to the public DSN
// since frontend errors aren't sensitive and we don't run a separate server DSN.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV || "local",
  tracesSampleRate: 0.1,
});
