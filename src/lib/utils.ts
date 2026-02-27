import { differenceInDays, format } from 'date-fns'

export function daysSince(dateString: string): number {
  return differenceInDays(new Date(), new Date(dateString))
}

export function formatDate(dateString: string): string {
  return format(new Date(dateString), 'MMM d, yyyy')
}

export function getWaitingStatus(dayCount: number): 'normal' | 'amber' | 'red' {
  if (dayCount >= 14) return 'red'
  if (dayCount >= 7) return 'amber'
  return 'normal'
}

export function getWaitingLabel(dayCount: number): string {
  if (dayCount >= 14) return `${dayCount} days — time to act`
  if (dayCount >= 7) return `${dayCount} days — follow up?`
  return `${dayCount} days`
}
