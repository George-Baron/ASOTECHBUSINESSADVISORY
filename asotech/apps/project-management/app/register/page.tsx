import { redirect } from "next/navigation";
// Staff accounts are created by an administrator in Supabase; there is no public registration here.
export default function RegisterPage() { redirect("/login"); }
