import type { MetadataRoute } from "next";

/**
 * PWA manifest so "Add to Home Screen" produces a real app entry with an icon and
 * no browser chrome. This is the cheapest possible "we have an app" for students,
 * who overwhelmingly hit a homework tool from a phone.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StudyHack — course-specific homework help",
    short_name: "StudyHack",
    description:
      "Homework help grounded in your own course materials, plus what your professor actually tests.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f7f4ec",
    theme_color: "#b45309",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
