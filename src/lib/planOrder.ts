import type { DailyPlan, PlanItem } from '../types'

/**
 * Derives an itemOrder array from existing per-tier arrays.
 * Used for backward compatibility when a plan doesn't have itemOrder set.
 */
export function deriveItemOrder(plan: DailyPlan): PlanItem[] {
  const order = plan.blockOrder ?? ['deep', 'short', 'maintenance']
  const items: PlanItem[] = []

  for (const tier of order) {
    if (tier === 'deep') {
      if (plan.deepBlock.projectId) {
        items.push({ id: plan.deepBlock.projectId, type: 'project', tier: 'deep' })
      }
      if (plan.deepMeetingId) {
        items.push({ id: plan.deepMeetingId, type: 'meeting', tier: 'deep' })
      }
    } else if (tier === 'short') {
      for (const id of plan.shortProjects ?? []) {
        items.push({ id, type: 'project', tier: 'short' })
      }
      for (const id of plan.shortTasks) {
        items.push({ id, type: 'task', tier: 'short' })
      }
      for (const id of plan.shortMeetingIds ?? []) {
        items.push({ id, type: 'meeting', tier: 'short' })
      }
    } else {
      for (const id of plan.maintenanceProjects ?? []) {
        items.push({ id, type: 'project', tier: 'maintenance' })
      }
      for (const id of plan.maintenanceTasks) {
        items.push({ id, type: 'task', tier: 'maintenance' })
      }
      for (const id of plan.maintenanceMeetingIds ?? []) {
        items.push({ id, type: 'meeting', tier: 'maintenance' })
      }
    }
  }

  return items
}

/**
 * Derives blockOrder from itemOrder by finding the first occurrence of each tier.
 */
export function deriveBlockOrder(itemOrder: PlanItem[]): Array<'deep' | 'short' | 'maintenance'> {
  const seen = new Set<string>()
  const order: Array<'deep' | 'short' | 'maintenance'> = []

  for (const item of itemOrder) {
    if (!seen.has(item.tier)) {
      seen.add(item.tier)
      order.push(item.tier)
    }
  }

  // Add any missing tiers at the end
  for (const tier of ['deep', 'short', 'maintenance'] as const) {
    if (!seen.has(tier)) {
      order.push(tier)
    }
  }

  return order
}
