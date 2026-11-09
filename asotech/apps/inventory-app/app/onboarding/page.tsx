import { AuthCard } from "@asotech/ui";
import { requireSession } from "@asotech/supabase/server";
import { signOut } from "@asotech/supabase/auth";
import { createOrganisation } from "./actions";

export const metadata = { title: "Set up your organisation" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const session = await requireSession();
  return (
    <AuthCard title="Set up your business" subtitle="Create your organisation to start a 14-day trial. You become its owner."
      footer={<form action={signOut}><button className="font-semibold text-navy underline">Sign out ({session.email})</button></form>}>
      <form action={createOrganisation} className="space-y-4">
        {sp.error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-bad">{sp.error}</p>}
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-semibold text-navy">Business name</label>
          <input id="name" name="name" required minLength={2} maxLength={200} autoComplete="organization" className="w-full rounded-lg border border-navy-200 px-3 py-2.5 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-brand-orange/60" />
        </div>
        <button className="w-full rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-bold text-navy hover:bg-[#f59a38]">Create organisation</button>
      </form>
    </AuthCard>
  );
}
