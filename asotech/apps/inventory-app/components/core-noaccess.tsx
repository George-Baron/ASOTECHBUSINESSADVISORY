export function NoAccess({ what }: { what: string }) {
  return (
    <div className="rounded-xl border border-dashed border-navy-200 bg-white px-6 py-10 text-center">
      <p className="font-bold text-navy">You do not have access to {what}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate2">Ask an owner or administrator of this organisation to change your role.</p>
    </div>
  );
}
