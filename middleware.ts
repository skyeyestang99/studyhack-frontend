import { clerkMiddleware } from "@clerk/nextjs/server";

// Wires Clerk session context into every request. Route protection is handled
// client-side by ProtectedRoute (and Clerk's <SignedIn>/<SignedOut>), so we
// don't force edge protection here.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next internals and static files, run on everything else.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
