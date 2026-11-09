"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="no-print inline-flex items-center justify-center rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-navy hover:bg-[#f59a38] focus:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
      Print / Save as PDF
    </button>
  );
}
