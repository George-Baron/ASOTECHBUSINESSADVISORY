"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-extrabold text-navy">Something went wrong</h1>
      <p className="max-w-md text-slate2">An unexpected error occurred. Please try again, or contact us if it continues.</p>
      <button onClick={reset} className="rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-bold text-navy hover:bg-[#f59a38]">Try again</button>
    </main>
  );
}
