import { differenceInWeeks, parseISO } from 'date-fns'
import type { LifeWeeks } from '../types'

const TOTAL_WEEKS = 4000 // ~76.9 years
const WEEKS_PER_YEAR = 52

export function calculateLifeWeeks(birthDate: string): LifeWeeks {
  const birth = parseISO(birthDate)
  const now = new Date()
  const weeksLived = Math.max(0, differenceInWeeks(now, birth))
  const weeksRemaining = Math.max(0, TOTAL_WEEKS - weeksLived)
  const currentWeekNumber = weeksLived + 1

  return {
    birthDate,
    weeksLived,
    weeksRemaining,
    currentWeekNumber,
  }
}

export function getYearsFromWeeks(weeks: number): number {
  return Math.floor(weeks / WEEKS_PER_YEAR)
}

export function getPercentageLived(weeksLived: number): number {
  return Math.min(100, (weeksLived / TOTAL_WEEKS) * 100)
}

export { TOTAL_WEEKS, WEEKS_PER_YEAR }
