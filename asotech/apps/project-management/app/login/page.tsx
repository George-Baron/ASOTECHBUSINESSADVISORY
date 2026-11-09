import Link from "next/link";
import { AuthCard, AuthForm } from "@asotech/ui";
import { signIn, safeNext } from "@asotech/supabase/auth";

export const metadata = { title: "Sign in" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string; next?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthCard
      title="Welcome back" subtitle="ASOTECH staff sign in"
      footer={<><Link className="font-semibold text-navy underline" href="/forgot-password">Forgot password?</Link></>}
    >
      <AuthForm mode="login" action={signIn} error={sp.error} notice={sp.notice} next={await safeNext(sp.next)} />
    </AuthCard>
  );
}
