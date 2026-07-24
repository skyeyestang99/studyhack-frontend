const { withSentryConfig } = require("@sentry/nextjs");
const { PHASE_PRODUCTION_BUILD } = require("next/constants");

/** @type {(phase: string) => import('next').NextConfig} */
const buildNextConfig = (phase) => ({
  ...(phase === PHASE_PRODUCTION_BUILD ? { distDir: ".next-build" } : {}),
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
        }/api/:path*`,
      },
    ];
  },
});

// Sentry build-time options (source map upload). No-op locally without
// SENTRY_AUTH_TOKEN/SENTRY_ORG/SENTRY_PROJECT set (falls through silently).
module.exports = (phase) =>
  withSentryConfig(buildNextConfig(phase), {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: true,
    widenClientFileUpload: true,
    disableLogger: true,
  });
