import { articlePlatforms } from "@/lib/article-platforms";

export function ArticleFilters({
  action,
  platform,
  sort = "latest",
  status,
}: {
  action: string;
  platform: string;
  sort?: "latest" | "oldest";
  status?: "pending" | "rejected";
}) {
  return (
    <form
      action={action}
      className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-panel/70 p-4"
      method="get"
    >
      {status ? <input name="status" type="hidden" value={status} /> : null}
      <div className="grid min-w-[180px] gap-1.5">
        <label className="text-xs font-medium text-muted-foreground" htmlFor={`${action}-platform`}>
          Platform
        </label>
        <select
          className="min-h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
          defaultValue={platform}
          id={`${action}-platform`}
          name="platform"
        >
          <option value="">All platforms</option>
          {articlePlatforms.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      {status === undefined ? (
        <div className="grid min-w-[150px] gap-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`${action}-sort`}>
            Order
          </label>
          <select
            className="min-h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
            defaultValue={sort}
            id={`${action}-sort`}
            name="sort"
          >
            <option value="latest">Latest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      ) : null}
      <button
        className="min-h-10 rounded-lg border border-accent/40 bg-accent/10 px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent/20"
        type="submit"
      >
        Apply filters
      </button>
    </form>
  );
}
