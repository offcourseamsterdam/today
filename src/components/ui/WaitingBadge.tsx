import { daysSince, getWaitingStatus, getWaitingLabel } from '../../lib/utils'

interface WaitingBadgeProps {
  since: string
  shape?: 'rounded' | 'rounded-full'
}

export function WaitingBadge({ since, shape = 'rounded' }: WaitingBadgeProps) {
  const days = daysSince(since)
  const status = getWaitingStatus(days)
  return (
    <span className={`text-[10px] px-1.5 py-0.5
      ${shape === 'rounded-full' ? 'rounded-full' : 'rounded'}
      ${status === 'red'
        ? 'bg-[var(--color-status-red-bg)] text-[var(--color-status-red-text)]'
        : status === 'amber'
          ? 'bg-[var(--color-status-amber-bg)] text-[var(--color-status-amber-text)]'
          : 'bg-border-light text-stone'}`}>
      {getWaitingLabel(days)}
    </span>
  )
}
