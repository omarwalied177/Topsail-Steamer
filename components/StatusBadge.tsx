const COLORS: Record<string, { bg: string; fg: string }> = {
  yes: { bg: "#7FA69433", fg: "#3f5f52" },
  y: { bg: "#7FA69433", fg: "#3f5f52" },
  approved: { bg: "#7FA69433", fg: "#3f5f52" },
  approve: { bg: "#7FA69433", fg: "#3f5f52" },
  no: { bg: "#c1502e22", fg: "#8a3a21" },
  n: { bg: "#c1502e22", fg: "#8a3a21" },
  decline: { bg: "#c1502e22", fg: "#8a3a21" },
  declined: { bg: "#c1502e22", fg: "#8a3a21" },
  edit: { bg: "#e2a63b33", fg: "#8a651f" },
  pending: { bg: "#e2a63b33", fg: "#8a651f" },
};

export function StatusBadge({ value }: { value: string }) {
  const key = value.trim().toLowerCase();
  const { bg, fg } = COLORS[key] ?? { bg: "#0f2a3d14", fg: "#0f2a3d" };

  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: bg, color: fg }}
    >
      {value || "—"}
    </span>
  );
}
