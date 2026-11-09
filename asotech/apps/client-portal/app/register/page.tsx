import Link from "next/link";
import { AuthCard, AuthForm } from "@asotech/ui";
import { signUp } from "@asotech/supabase/auth";

export const metadata = { title: "Create account" };
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthCard title="Create your account" footer={<>Already registered? <Link className="font-semibold text-navy underline" href="/login">Sign in</Link></>}>
      <AuthForm mode="register" action={signUp} error={sp.error} />
    </AuthCard>
  );
}
