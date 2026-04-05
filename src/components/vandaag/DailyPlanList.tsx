import { useState, useCallback, useEffect, Fragment } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { useStore } from '../../store'
import { useTodayPlan } from '../../hooks/useTodayPlan'
import { useTaskToggle } from '../../hooks/useTaskToggle'
import { deriveItemOrder, deriveBlockOrder } from '../../lib/planOrder'
import type { PlanItem, PlanTier } from '../../types'
import { SortableVandaagItem } from './SortableVandaagItem'
import { TierSectionHeader } from './TierSectionHeader'

interface CitadelContext {
  tier: PlanTier
  taskId: string
  taskTitle: string
  projectTitle?: string
  projectId?: string
}

interface DailyPlanListProps {
  onEnterCitadel: (ctx?: CitadelContext) => void
  onOpenMeetings: () => void
}

export function DailyPlanList({ onEnterCitadel, onOpenMeetings }: DailyPlanListProps) {
  const { dailyPlan } = useTodayPlan()
  const setItemOrder = useStore(s => s.setItemOrder)
  const setBlockOrder = useStore(s => s.setBlockOrder)
  const meetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)
  const toggleTask = useTaskToggle()

  // Local ordering state — seeded from plan, synced via effect
  const [orderedItems, setOrderedItems] = useState<PlanItem[]>(() => {
    if (!dailyPlan) return []
    return dailyPlan.itemOrder ?? deriveItemOrder(dailyPlan)
  })

  // Sync from store when plan changes externally (planning modal lock-in, date change)
  const externalItemOrderJson = JSON.stringify(dailyPlan?.itemOrder ?? [])
  useEffect(() => {
    if (dailyPlan) {
      setOrderedItems(dailyPlan.itemOrder ?? deriveItemOrder(dailyPlan))
    } else {
      setOrderedItems([])
    }
  }, [externalItemOrderJson]) // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(useSensor(PointerSensor))

  // ── Sync to store ──────────────────────────────────────────────────

  const syncToStore = useCallback((items: PlanItem[]) => {
    if (!dailyPlan) return

    // Build per-tier arrays from flat list
    const deepProjectId = items.find(i => i.tier === 'deep' && i.type === 'project')?.id ?? ''
    const deepMeetingId = items.find(i => i.tier === 'deep' && i.type === 'meeting')?.id
    const shortTasks = items.filter(i => i.tier === 'short' && i.type === 'task').map(i => i.id)
    const shortProjects = items.filter(i => i.tier === 'short' && i.type === 'project').map(i => i.id)
    const shortMeetingIds = items.filter(i => i.tier === 'short' && i.type === 'meeting').map(i => i.id)
    const maintenanceTasks = items.filter(i => i.tier === 'maintenance' && i.type === 'task').map(i => i.id)
    const maintenanceProjects = items.filter(i => i.tier === 'maintenance' && i.type === 'project').map(i => i.id)
    const maintenanceMeetingIds = items.filter(i => i.tier === 'maintenance' && i.type === 'meeting').map(i => i.id)

    // Single atomic update via store
    setItemOrder(items)
    setBlockOrder(deriveBlockOrder(items))

    // Reconcile per-tier arrays by setting the whole plan
    useStore.setState(s => {
      if (!s.dailyPlan) return {}
      return {
        dailyPlan: {
          ...s.dailyPlan,
          deepBlock: { ...s.dailyPlan.deepBlock, projectId: deepProjectId },
          deepMeetingId,
          shortTasks,
          shortProjects,
          shortMeetingIds,
          maintenanceTasks,
          maintenanceProjects,
          maintenanceMeetingIds,
          itemOrder: items,
          blockOrder: deriveBlockOrder(items),
        },
      }
    })
  }, [dailyPlan, setItemOrder, setBlockOrder])

  // ── Handlers ───────────────────────────────────────────────────────

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = orderedItems.findIndex(i => `plan-${i.id}` === active.id)
    const newIndex = orderedItems.findIndex(i => `plan-${i.id}` === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const newItems = arrayMove(orderedItems, oldIndex, newIndex)
    setOrderedItems(newItems)
    syncToStore(newItems)
  }

  function handleTierChange(id: string, newTier: 'deep' | 'short' | 'maintenance') {
    const item = orderedItems.find(i => i.id === id)
    if (!item) return

    // Enforce constraints
    if (newTier === 'deep') {
      const existingDeep = orderedItems.find(i => i.tier === 'deep' && i.type === 'project')
      if (existingDeep && existingDeep.id !== id) return // max 1 deep project
    }
    if (newTier === 'short') {
      const shortSlots = orderedItems
        .filter(i => i.tier === 'short' && i.id !== id)
        .reduce((sum, i) => {
          if (i.type === 'meeting') {
            const m = [...meetings, ...recurringMeetings].find(m => m.id === i.id)
            return sum + Math.ceil((m?.durationMinutes ?? 60) / 60)
          }
          return sum + 1
        }, 0)
      const thisSlots = item.type === 'meeting'
        ? Math.ceil(([...meetings, ...recurringMeetings].find(m => m.id === id)?.durationMinutes ?? 60) / 60)
        : 1
      if (shortSlots + thisSlots > 3) return // max 3 short slots
    }

    // Update tier and re-sort: group by tier, keeping within-tier order
    const updated = orderedItems.map(i => i.id === id ? { ...i, tier: newTier } : i)
    // Re-group items by tier while preserving within-tier order
    const blockOrder = deriveBlockOrder(updated)
    const grouped: PlanItem[] = []
    for (const tier of blockOrder) {
      grouped.push(...updated.filter(i => i.tier === tier))
    }

    setOrderedItems(grouped)
    syncToStore(grouped)
  }

  function handleRemove(id: string) {
    const newItems = orderedItems.filter(i => i.id !== id)
    setOrderedItems(newItems)
    syncToStore(newItems)
  }

  // ── Render ─────────────────────────────────────────────────────────

  if (!dailyPlan || orderedItems.length === 0) return null

  // Group items by tier for rendering headers
  const sortableIds = orderedItems.map(i => `plan-${i.id}`)

  // Compute slot counts per tier
  const deepCount = orderedItems.filter(i => i.tier === 'deep').length
  const shortCount = orderedItems.filter(i => i.tier === 'short').reduce((sum, i) => {
    if (i.type === 'meeting') {
      const m = [...meetings, ...recurringMeetings].find(m => m.id === i.id)
      return sum + Math.ceil((m?.durationMinutes ?? 60) / 60)
    }
    return sum + 1
  }, 0)
  const maintenanceCount = orderedItems.filter(i => i.tier === 'maintenance').length

  let lastTier: string | null = null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-1.5">
          {orderedItems.map(item => {
            const showHeader = item.tier !== lastTier
            lastTier = item.tier

            return (
              <Fragment key={item.id}>
                {showHeader && (
                  <TierSectionHeader
                    tier={item.tier}
                    slotCount={item.tier === 'deep' ? deepCount : item.tier === 'short' ? shortCount : maintenanceCount}
                    slotMax={item.tier === 'deep' ? 1 : item.tier === 'short' ? 3 : undefined}
                  />
                )}
                <SortableVandaagItem
                  item={item}
                  onEnterCitadel={onEnterCitadel}
                  onOpenMeetings={onOpenMeetings}
                  onRemove={handleRemove}
                  onTierChange={handleTierChange}
                  toggleTask={toggleTask}
                />
              </Fragment>
            )
          })}
        </div>
      </SortableContext>
    </DndContext>
  )
}
