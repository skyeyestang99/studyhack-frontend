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

export const metadata: Metadata = {
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
    <ClerkProvider>
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
