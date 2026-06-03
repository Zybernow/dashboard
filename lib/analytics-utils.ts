// lib/analytics-utils.ts
export function formatNumber(n: number): string {
  return n.toLocaleString()
}

export function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`
}

export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return "—"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function timeAgo(iso: string): string {
  const date = new Date(iso)
  if (isNaN(date.getTime())) return "—"
  const ms = Date.now() - date.getTime()
  if (ms < 0) return "just now"
  const m = Math.floor(ms / 60_000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
