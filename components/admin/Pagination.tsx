import Link from "next/link";

function buildHref(basePath: string, query: Record<string, string>, page: number) {
  const params = new URLSearchParams(query);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export default function Pagination({
  page,
  totalPages,
  basePath,
  query = {},
}: {
  page: number;
  totalPages: number;
  basePath: string;
  query?: Record<string, string>;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between text-sm text-slate-600">
      <Link
        href={buildHref(basePath, query, Math.max(1, page - 1))}
        className={`btn-secondary ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
        aria-disabled={page <= 1}
      >
        Previous
      </Link>
      <span>
        Page {page} of {totalPages}
      </span>
      <Link
        href={buildHref(basePath, query, Math.min(totalPages, page + 1))}
        className={`btn-secondary ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
        aria-disabled={page >= totalPages}
      >
        Next
      </Link>
    </div>
  );
}
