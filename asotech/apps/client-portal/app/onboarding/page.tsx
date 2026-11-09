import { AuthCard } from "@asotech/ui";
import { signOut } from "@asotech/supabase/auth";
import { requireSession } from "@asotech/supabase/server";
import { CONTACT } from "@asotech/configuration";

export const metadata = { title: "Account not yet linked" };
export default async function Onboarding() {
  const s = await requireSession();
  return (
    <AuthCard title="Your account is not linked yet" subtitle={`Signed in as ${s.email}`}>
      <p className="text-sm text-slate2">
        ASOTECH Business Advisory staff link each portal account to your organisation. Once that is done you will see your projects, reports,
        deliverables and audit findings here. Please contact your ASOTECH project manager, or reach us using the details below.
      </p>
      <ul className="space-y-1 text-sm text-navy">
        <li>Email: <a className="font-semibold underline" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></li>
        <li>Phone: <a className="font-semibold underline" href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}>{CONTACT.phone}</a></li>
      </ul>
      <form action={signOut}><button className="w-full rounded-lg bg-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-700">Sign out</button></form>
    </AuthCard>
  );
}
