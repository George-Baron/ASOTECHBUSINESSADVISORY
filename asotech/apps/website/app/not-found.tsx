import Link from "next/link";
import { Logo, LinkButton } from "@asotech/ui";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
      <Logo />
      <h1 className="text-4xl font-extrabold text-navy">Page not found</h1>
      <p className="max-w-md text-slate2">The page you are looking for does not exist or has moved.</p>
      <div className="flex gap-3"><LinkButton href="/">Go to home</LinkButton><Link href="/contact" className="rounded-lg border border-navy-100 px-4 py-2.5 text-sm font-semibold text-navy hover:bg-navy-50">Contact us</Link></div>
    </main>
  );
}
