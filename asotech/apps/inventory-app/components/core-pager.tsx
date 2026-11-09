import Link from "next/link";
import { href } from "./core-util";

export function Pager({ base, params, page, total, pageSize }: {
  base: string; params: Record<string, string | undefined>; page: number; total: number; pageSize: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const cls = "rounded-lg border border-navy-100 bg-white px-3 py-1.5 text-sm font-semibold text-navy hover:bg-navy-50";
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm text-slate2">
      <span>Page {page} of {pages} · {total} records</span>
      <span className="flex gap-2">
        {page > 1 && <Link className={cls} href={href(base, { ...params, page: page - 1 })}>Previous</Link>}
        {page < pages && <Link className={cls} href={href(base, { ...params, page: page + 1 })}>Next</Link>}
      </span>
    </nav>
  );
}
