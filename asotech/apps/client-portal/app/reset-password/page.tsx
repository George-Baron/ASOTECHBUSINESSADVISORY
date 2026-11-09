import { AuthCard } from "@asotech/ui";
import { updatePassword } from "@asotech/supabase/auth";

export const metadata = { title: "Choose a new password" };
export default async function ResetPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthCard title="Choose a new password">
      <form action={updatePassword} className="space-y-4">
        {sp.error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-bad">{sp.error}</p>}
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-semibold text-navy">New password</label>
          <input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" className="w-full rounded-lg border border-navy-200 px-3 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-brand-orange/60" />
        </div>
        <button className="w-full rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-bold text-navy hover:bg-[#f59a38]">Update password</button>
      </form>
    </AuthCard>
  );
}
