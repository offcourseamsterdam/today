import { format, getDay } from 'date-fns'
import type { RecurrenceFrequency, RecurrenceRule } from '../types'

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const WEEK_LABELS = ['1st', '2nd', '3rd', '4th', '5th']
export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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
  { key: 'custom', label: 'Custom days' },
  { key: 'annual_dates', label: 'Specific dates' },
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
    case 'annual_dates': {
      const dates = rule.annualDates ?? []
      if (dates.length === 0) return 'Annual dates'
      return dates.map(d => `${MONTH_LABELS[d.month - 1]} ${d.day}`).join(', ')
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
  annualDates?: { month: number; day: number }[]
}

/**
 * Returns true if the given recurrence rule fires on the specified date (defaults to today).
 * Used by both recurring tasks and recurring meetings.
 */
export function isDueToday(rule: RecurrenceRule, date: Date = new Date()): boolean {
  const dow = getDay(date) // 0=Sun...6=Sat
  const dom = date.getDate() // 1–31
  switch (rule.frequency) {
    case 'daily': return true
    case 'weekdays': return dow >= 1 && dow <= 5
    case 'weekly': return rule.customDays?.includes(dow) ?? dow === 1
    case 'custom': return rule.customDays?.includes(dow) ?? false
    case 'monthly_date': return rule.monthlyDate === dom
    case 'monthly_weekday': {
      if (!rule.monthlyWeekday) return false
      const { week, day } = rule.monthlyWeekday
      if (dow !== day) return false
      return Math.ceil(dom / 7) === week
    }
    case 'annual_dates': {
      const dates = rule.annualDates ?? []
      const month = date.getMonth() + 1
      const day = date.getDate()
      return dates.some(d => d.month === month && d.day === day)
    }
    default: return false
  }
}

export function buildRule(opts: BuildRuleOpts): RecurrenceRule {
  const { freq, weeklyDay = 1, monthlyDate = 1, monthlyWeek = 1, monthlyDay = 1, customDays = [], annualDates = [] } = opts
  switch (freq) {
    case 'weekly': return { frequency: freq, customDays: [weeklyDay] }
    case 'monthly_date': return { frequency: freq, monthlyDate }
    case 'monthly_weekday': return { frequency: freq, monthlyWeekday: { week: monthlyWeek, day: monthlyDay } }
    case 'custom': return { frequency: freq, customDays }
    case 'annual_dates': return { frequency: freq, annualDates }
    default: return { frequency: freq }
  }
}

/**
 * Returns the Date of the N-th occurrence of `day` (0=Sun…6=Sat) in the given
 * year/month, or null if it doesn't exist (e.g. 5th Monday in a short month).
 */
export function findNthWeekday(year: number, month: number, week: number, day: number): Date | null {
  let count = 0
  for (let d = 1; d <= 31; d++) {
    const dt = new Date(year, month, d)
    if (dt.getMonth() !== month) break
    if (getDay(dt) === day) {
      count++
      if (count === week) return dt
    }
  }
  return null
}

/**
 * Returns the most recent date (≤ today) when this rule was supposed to fire,
 * formatted as YYYY-MM-DD. Returns null if the rule has no meaningful past occurrence
 * (e.g. annual_dates with no dates configured).
 * Used to detect whether the last occurrence was missed.
 */
export function getMostRecentOccurrenceDate(rule: RecurrenceRule, today: Date): string | null {
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd')
  const todayStr = fmt(today)
  const dow = getDay(today)
  const dom = today.getDate()

  switch (rule.frequency) {
    case 'daily': {
      return todayStr
    }
    case 'weekdays': {
      if (dow >= 1 && dow <= 5) return todayStr
      // Sun → last Fri (2 days back), Sat → last Fri (1 day back)
      const daysBack = dow === 0 ? 2 : 1
      return fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysBack))
    }
    case 'weekly': {
      const targetDow = (rule.customDays ?? [1])[0]
      const d = new Date(today)
      for (let i = 0; i < 7; i++) {
        if (getDay(d) === targetDow) return fmt(d)
        d.setDate(d.getDate() - 1)
      }
      return null
    }
    case 'custom': {
      const days = rule.customDays ?? []
      if (days.length === 0) return null
      const d = new Date(today)
      for (let i = 0; i < 14; i++) {
        if (days.includes(getDay(d))) return fmt(d)
        d.setDate(d.getDate() - 1)
      }
      return null
    }
    case 'monthly_date': {
      const targetDom = rule.monthlyDate
      if (!targetDom) return null
      if (dom >= targetDom) {
        return fmt(new Date(today.getFullYear(), today.getMonth(), targetDom))
      }
      return fmt(new Date(today.getFullYear(), today.getMonth() - 1, targetDom))
    }
    case 'monthly_weekday': {
      if (!rule.monthlyWeekday) return null
      const { week, day } = rule.monthlyWeekday
      const thisMonth = findNthWeekday(today.getFullYear(), today.getMonth(), week, day)
      if (thisMonth && thisMonth <= today) return fmt(thisMonth)
      const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const prevMonth = findNthWeekday(prev.getFullYear(), prev.getMonth(), week, day)
      return prevMonth ? fmt(prevMonth) : null
    }
    case 'annual_dates': {
      const dates = rule.annualDates ?? []
      if (dates.length === 0) return null
      let mostRecent: string | null = null
      for (const { month, day } of dates) {
        const thisYear = `${today.getFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const candidate = thisYear <= todayStr
          ? thisYear
          : `${today.getFullYear() - 1}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        if (!mostRecent || candidate > mostRecent) mostRecent = candidate
      }
      return mostRecent
    }
    default: return null
  }
}
