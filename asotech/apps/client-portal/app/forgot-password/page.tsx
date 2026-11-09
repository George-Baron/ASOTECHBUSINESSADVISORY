import Link from "next/link";
import { AuthCard, AuthForm } from "@asotech/ui";
import { requestPasswordReset } from "@asotech/supabase/auth";

export const metadata = { title: "Reset password" };
export default function ForgotPage() {
  return (
    <AuthCard title="Reset your password" subtitle="Enter your email and we will send a reset link." footer={<Link className="font-semibold text-navy underline" href="/login">Back to sign in</Link>}>
      <AuthForm mode="forgot" action={requestPasswordReset} />
    </AuthCard>
  );
}
