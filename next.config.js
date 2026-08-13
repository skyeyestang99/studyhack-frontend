const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
  },
  async rewrites() {
    return [
      // Clerk production instances need their Frontend API served from a domain we
      // control. This host is *.vercel.app, where the usual CNAME cannot be added,
      // so Clerk provisioned the instance in proxy mode at /__clerk. The handler
      // cannot live at app/__clerk because the App Router treats leading-underscore
      // folders as private and drops them from routing.
      {
        source: "/__clerk/:path*",
        destination: "/clerk-proxy/:path*",
      },
      {
        source: "/api/:path*",
        destination: `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
        }/api/:path*`,
      },
    ];
  },
};

// Sentry build-time options (source map upload). No-op locally without
// SENTRY_AUTH_TOKEN/SENTRY_ORG/SENTRY_PROJECT set (falls through silently).
module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  disableLogger: true,
});
