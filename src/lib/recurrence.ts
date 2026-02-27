import type { RecurrenceFrequency, RecurrenceRule } from '../types'

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const WEEK_LABELS = ['1st', '2nd', '3rd', '4th', '5th']

const _pr = new Intl.PluralRules('en-US', { type: 'ordinal' })
const _suffixes: Record<string, string> = { one: 'st', two: 'nd', few: 'rd', other: 'th' }
function toOrdinal(n: number): string {
  return `${n}${_suffixes[_pr.select(n)]}`
}

export const FREQ_OPTIONS: { key: RecurrenceFrequency; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekdays', label: 'Weekdays' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly_date', label: 'Day of month' },
  { key: 'monthly_weekday', label: 'Nth weekday' },
  { key: 'custom', label: 'Custom' },
]

export function describeRule(rule: RecurrenceRule): string {
  switch (rule.frequency) {
    case 'daily': return 'Daily'
    case 'weekdays': return 'Weekdays'
    case 'weekly': {
      const days = rule.customDays ?? [1]
      return days.length === 1
        ? `Every ${DAY_LABELS[days[0]]}`
        : `Every ${days.map(d => DAY_LABELS[d]).join(', ')}`
    }
    case 'custom': {
      const days = rule.customDays ?? []
      return days.length === 0 ? 'Custom' : days.map(d => DAY_LABELS[d]).join(', ')
    }
    case 'monthly_date':
      return rule.monthlyDate ? `${toOrdinal(rule.monthlyDate)} of month` : 'Monthly'
    case 'monthly_weekday': {
      if (!rule.monthlyWeekday) return 'Monthly'
      const { week, day } = rule.monthlyWeekday
      return `${WEEK_LABELS[week - 1]} ${DAY_LABELS[day]} of month`
    }
    default: return 'Recurring'
  }
}

export type BuildRuleOpts = {
  freq: RecurrenceFrequency
  weeklyDay?: number
  monthlyDate?: number
  monthlyWeek?: number
  monthlyDay?: number
  customDays?: number[]
}

export function buildRule(opts: BuildRuleOpts): RecurrenceRule {
  const { freq, weeklyDay = 1, monthlyDate = 1, monthlyWeek = 1, monthlyDay = 1, customDays = [] } = opts
  switch (freq) {
    case 'weekly': return { frequency: freq, customDays: [weeklyDay] }
    case 'monthly_date': return { frequency: freq, monthlyDate }
    case 'monthly_weekday': return { frequency: freq, monthlyWeekday: { week: monthlyWeek, day: monthlyDay } }
    case 'custom': return { frequency: freq, customDays }
    default: return { frequency: freq }
  }
}
