import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import SignupForm from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create an account · LivrUSP",
};

export default function SignupPage() {
  return (
    <AuthShell mode="signup">
      <SignupForm />
    </AuthShell>
  );
}
