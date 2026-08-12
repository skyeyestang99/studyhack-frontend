"use client";

import { SignUp } from "@clerk/nextjs";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <SignUp
        routing="hash"
        signInUrl="/login"
        forceRedirectUrl="/dashboard"
      />
    </div>
  );
}
