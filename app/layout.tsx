import type { Metadata } from "next";
import localFont from "next/font/local";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import "katex/dist/katex.min.css";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

/**
 * Stable base for social preview URLs.
 *
 * Without this, Next derives og:image from the per-deployment Vercel host
 * (studyhack-frontend-<hash>.vercel.app). Those URLs die when the deployment is
 * pruned, so a shared invite link would silently stop unfurling — which defeats
 * the point of having an OG image, since the invite is the growth mechanic.
 *
 * NEXT_PUBLIC_SITE_URL when set; otherwise the stable per-environment alias.
 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NEXT_PUBLIC_APP_ENV === "production"
    ? "https://studyhack-frontend.vercel.app"
    : "https://studyhack-staging.vercel.app");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  // Template so course/dashboard pages can set their own title without repeating
  // the brand, and social cards get a real title/description/image instead of
  // unfurling as nothing when an invite link is pasted into a group chat.
  title: {
    default: "StudyHack — homework help that knows your class",
    template: "%s · StudyHack",
  },
  description:
    "Homework help grounded in your own course materials, with citations — plus what your professor actually tests.",
  applicationName: "StudyHack",
  openGraph: {
    title: "StudyHack — homework help that knows your class",
    description:
      "Answers cited from your own course materials, plus what your professor actually tests.",
    siteName: "StudyHack",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StudyHack — homework help that knows your class",
    description:
      "Answers cited from your own course materials, plus what your professor actually tests.",
  },
};

export const viewport = {
  // Lets the app fill the screen when launched from the home screen, and keeps the
  // browser UI colour consistent with the brand.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ec" },
    { media: "(prefers-color-scheme: dark)", color: "#141312" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // proxyUrl is set only where a Clerk PRODUCTION instance is in use. Test
    // instances talk to clerk.accounts.dev directly, so leaving this undefined on
    // staging is correct rather than an omission.
    <ClerkProvider proxyUrl={process.env.NEXT_PUBLIC_CLERK_PROXY_URL}>
      <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('studyhack-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <ThemeProvider>
          {/* Chrome lives in the route groups: (marketing) renders nav+footer,
              (app) renders a full-height shell with neither. Putting it here
              forced a marketing footer onto the dashboard and chat. */}
          <div className="bg-background text-foreground">{children}</div>
          <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </body>
      </html>
    </ClerkProvider>
  );
}
