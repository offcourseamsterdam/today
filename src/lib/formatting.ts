/** Format a duration in minutes to a compact string: "30m", "1h 30m", "2h" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

/** Format a 24h time string "HH:mm" unchanged (identity, but explicit) */
export function formatTimeShort(time: string): string {
  const [h, m] = time.split(':')
  return `${h}:${m}`
}
