export function StatusPill({ status }: { status: string | null }) {
  if (!status) return <span className="status-pill status-neutral">Not issued</span>
  const labels: Record<string, string> = {
    ACTIVE: 'Active',
    REVOKED: 'Revoked',
  }
  return <span className={`status-pill status-${status.toLowerCase()}`}>{labels[status] ?? status}</span>
}
