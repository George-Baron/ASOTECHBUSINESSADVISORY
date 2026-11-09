"use client";

export function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="no-print rounded-lg border border-navy-100 bg-white px-4 py-2 text-sm font-semibold text-navy hover:bg-navy-50">
      {label}
    </button>
  );
}
