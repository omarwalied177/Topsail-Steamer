export function SetupNeeded({ message }: { message: string }) {
  return (
    <div
      className="rounded-lg p-6 text-sm"
      style={{ background: "#e2a63b22", border: "1px solid var(--mustard)" }}
    >
      <p className="font-semibold mb-1" style={{ color: "var(--mustard-dark)" }}>
        This section isn&apos;t connected yet
      </p>
      <p style={{ color: "var(--navy)" }}>{message}</p>
      <p className="mt-2" style={{ color: "var(--navy)" }}>
        Check your Supabase environment variables in <code>.env.local</code>.
      </p>
    </div>
  );
}
