import { StatusBadge } from "@/components/StatusBadge";

const STATUS_COLUMNS = new Set([
  "Status",
  "Welcome Sent",
  "Reminder Sent",
]);

export function DataTable({
  rows,
  emptyLabel,
}: {
  rows: Record<string, string>[];
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return (
      <div
        className="rounded-lg border border-dashed p-10 text-center text-sm"
        style={{ borderColor: "var(--navy-light)", color: "var(--navy-light)" }}
      >
        {emptyLabel}
      </div>
    );
  }

  const columns = Object.keys(rows[0]);

  return (
    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "#0f2a3d1a" }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: "var(--navy)" }}>
            {columns.map((col) => (
              <th
                key={col}
                className="text-left px-4 py-2.5 font-semibold whitespace-nowrap"
                style={{ color: "var(--sand)" }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-t"
              style={{
                borderColor: "#0f2a3d14",
                background: i % 2 === 0 ? "white" : "#0f2a3d08",
              }}
            >
              {columns.map((col) => (
                <td key={col} className="px-4 py-2.5 align-top max-w-xs">
                  {STATUS_COLUMNS.has(col) ? (
                    <StatusBadge value={row[col]} />
                  ) : (
                    <span className="text-[13px]">{row[col] || "—"}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
