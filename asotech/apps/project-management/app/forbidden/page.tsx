import { AuthCard } from "@asotech/ui";
import { signOut } from "@asotech/supabase/auth";

export const metadata = { title: "Access denied" };
export default function Forbidden() {
  return (
    <AuthCard title="You do not have access" subtitle="Your account is signed in but is not permitted to use this area.">
      <form action={signOut}><button className="w-full rounded-lg bg-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-700">Sign out</button></form>
    </AuthCard>
  );
}
