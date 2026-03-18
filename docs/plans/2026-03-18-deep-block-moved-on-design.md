# Deep Block — "Moving On" State Design

**Date:** 2026-03-18
**Status:** Approved

## Context

The existing × button on the deep block silently clears the project — no acknowledgment, no message. When a day runs differently (a task takes longer, a meeting eats the morning, the user pivots), the app should respond with warmth and a Burkeman quote rather than a cold reset. The 3-3-3 is a guide, not a contract.

---

## Hover Behaviour on the × Button

The × button transforms into a labelled "Moving on" button on hover using a CSS width transition:

- Default: `×` icon only (`text-stone/40`)
- Hover: icon + `"Moving on"` label slides in (`w-0 → w-auto overflow-hidden transition-all`), colour shifts to muted amber (`text-amber-600/60`)
- Uses `group` + `group-hover:` Tailwind pattern on the button wrapper

---

## Store Changes

Mirror the `completeDeepBlock` pattern exactly.

**`src/types/index.ts` — extend `deepBlock`:**
```ts
deepBlock: {
  projectId: string
  intention?: string
  calendarEventId?: string
  completedProjectTitle?: string
  completedAt?: string
  movedOnProjectTitle?: string   // ← new
  movedOnAt?: string             // ← new
}
```

**`src/store/helpers.ts` — new action in `makePlanActions`:**
```ts
moveOnFromDeepBlock: (projectTitle: string) => set(state => {
  const plan = ensureTodayPlan(state)
  plan.deepBlock = {
    ...plan.deepBlock,
    projectId: '',
    movedOnProjectTitle: projectTitle,
    movedOnAt: new Date().toISOString(),
  }
}),
```

**`src/store/types.ts`:** Add `moveOnFromDeepBlock: (projectTitle: string) => void` to `VandaagState`.

**`src/store/plansSlice.ts`:** Wire `moveOnFromDeepBlock: todayActions.moveOnFromDeepBlock`.

**`src/hooks/useTodayPlan.ts`:** Add `moveOnFromDeepBlock` selector + return value.

---

## Quotes

Add `getMovedOnQuote()` to `src/lib/quotes.ts` — picks from a curated subset of the existing 30 quotes that speak to accepting imperfection, limits, and days going differently. Use day-of-year seed (same pattern as `getTodayQuote`) so it's consistent per day but different from the done-state quote (offset seed by +15).

Suitable existing quotes to include in the subset:
- *"You have to accept that there will always be too much to do"*
- *"Missing out is inevitable"*
- *"The day will always have run differently than you'd planned"* (if not already present, add it)
- Any quotes about finitude, acceptance, letting go

---

## DeepBlock.tsx Changes

**New derived state:**
```ts
const movedOnProjectTitle = dailyPlan?.deepBlock.movedOnProjectTitle
const isMovedOn = !!(movedOnProjectTitle && dailyPlan?.deepBlock.movedOnAt)
```

**Update `handleClear` → `handleMoveOn`:**
```ts
function handleMoveOn() {
  if (selectedProject) {
    moveOnFromDeepBlock(selectedProject.title)
  } else {
    clearDeepBlock()
  }
  setIntention('')
}
```

**× button → "Moving on" hover button:**
```tsx
<button
  onClick={handleMoveOn}
  className="group flex items-center gap-1 text-stone/40 hover:text-amber-600/60 transition-colors p-1"
>
  <X size={14} />
  <span className="overflow-hidden w-0 group-hover:w-auto transition-all duration-200
    text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100">
    Moving on
  </span>
</button>
```

**Gate body behind both states:**
```tsx
{isDoneToday ? (
  <DeepBlockComplete projectTitle={completedProjectTitle!} />
) : isMovedOn ? (
  <DeepBlockMovedOn projectTitle={movedOnProjectTitle!} />
) : (
  {/* existing content */}
)}
```

---

## DeepBlockMovedOn Component

Inline component in `DeepBlock.tsx`, same animation pattern as `DeepBlockComplete`.

**Visual:**
```
        →  (ArrowRight icon, stone/40, animated)

   Administratie
   Day ran differently — that's fine

 "You have to accept that there will
  always be too much to do."
  — Oliver Burkeman, Four Thousand Weeks
```

- Arrow icon: `text-stone/40`, uses `deepBlockComplete` keyframe (scale-in)
- Project title: `font-serif text-[18px] text-charcoal`
- Subtext: `"Day ran differently — that's fine"` — `text-[10px] uppercase tracking-[0.1em] text-stone/50`
- Quote: `font-serif text-[12px] text-stone/60 italic`
- Source: `text-[10px] text-stone/40`
- All text uses `fadeUpIn` keyframe with staggered delays

---

## MEMORY.md Update

Add to the Key Patterns or a new Philosophy section:

```
## Philosophy & Tone
- The 3-3-3 (deep block + 3 short + 3 maintenance) is a *guide*, not a contract
- The app acknowledges that days run differently — that's expected, not a failure
- Oliver Burkeman's core message: finitude is real, accept limits with grace
- UI copy and state messages should be warm/supportive, never performance-tracking
- The "moving on" state explicitly validates that pivoting mid-day is fine
```

---

## Critical Files

- `src/types/index.ts`
- `src/store/helpers.ts`
- `src/store/types.ts`
- `src/store/plansSlice.ts`
- `src/hooks/useTodayPlan.ts`
- `src/lib/quotes.ts` — add `getMovedOnQuote()` + any missing quotes
- `src/components/vandaag/DeepBlock.tsx`
- `/Users/beer/.claude/projects/-Users-beer-Vandaag-App/memory/MEMORY.md`

---

## Verification

1. Select a deep block project → hover × → "Moving on" label slides in
2. Click → locked moved-on card with arrow icon + project name + Burkeman quote
3. Refresh → state persists
4. Next day → resets to empty picker
5. MEMORY.md updated with philosophy note
