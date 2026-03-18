# Deep Block "Moving On" State — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the silent × clear button on the deep block with a hover-labelled "Moving on" button that locks the block into a supportive, Burkeman-quoted "day ran differently" state — persisted for the day, exactly mirroring the ✓ done state.

**Architecture:** Extend `DailyPlan.deepBlock` with `movedOnProjectTitle?` + `movedOnAt?`. Add `moveOnFromDeepBlock` action through the full store chain. In `DeepBlock.tsx`, replace `handleClear` with `handleMoveOn`, add `isMovedOn` derived state, update the × button with a hover-expand label, and add a `DeepBlockMovedOn` inline component. Update MEMORY.md with the 3-3-3 philosophy note.

**Tech Stack:** React 19, TypeScript strict, Zustand persist, Tailwind CSS 4, Lucide icons, `src/lib/quotes.ts`

---

### Task 1: Add `getMovedOnQuote()` to quotes.ts

**Files:**
- Modify: `src/lib/quotes.ts`

**Step 1: Add the function after `getRandomQuote`**

The "moved on" quotes are a curated subset of the existing 30 that speak to accepting imperfection and limits. Add to the bottom of the file:

```ts
// Indices of quotes best suited to the "day ran differently" moment
const MOVED_ON_QUOTE_INDICES = [1, 4, 9, 12, 17, 26, 27]
// Index 1:  "You have to accept that there will always be too much to do"
// Index 4:  "The day will never arrive when you finally have everything under control"
// Index 9:  "The core challenge of managing our limited time isn't about how to get everything done"
// Index 12: "It's precisely the fact that you don't have time for everything..."
// Index 17: "Any finite life — even the best one you could possibly imagine — is a matter of ceaselessly waving goodbye to possibility"
// Index 26: "Once you stop struggling to get on top of everything..."
// Index 27: "When you give up the unwinnable struggle to do everything..."

// Deterministic per day, offset from getTodayQuote to avoid showing the same quote twice
export function getMovedOnQuote(): BurkemanQuote {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  )
  const idx = MOVED_ON_QUOTE_INDICES[(dayOfYear + 15) % MOVED_ON_QUOTE_INDICES.length]
  return BURKEMAN_QUOTES[idx]
}
```

**Step 2: Build**
```bash
cd "/Users/beer/Vandaag App" && npm run build 2>&1 | tail -5
```
Expected: `✓ built in ...`

**Step 3: Commit**
```bash
git add src/lib/quotes.ts
git commit -m "feat: add getMovedOnQuote() for deep block moved-on state"
```

---

### Task 2: Extend types + add store action

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/store/helpers.ts`
- Modify: `src/store/types.ts`
- Modify: `src/store/plansSlice.ts`
- Modify: `src/hooks/useTodayPlan.ts`

**Step 1: Extend `DailyPlan.deepBlock` in `src/types/index.ts`**

Find the `deepBlock` field in `DailyPlan`. It currently has `completedProjectTitle?: string` and `completedAt?: string` (added recently). Add two more fields right after those:

```ts
deepBlock: {
  projectId: string
  intention?: string
  calendarEventId?: string
  completedProjectTitle?: string
  completedAt?: string
  movedOnProjectTitle?: string   // ← add
  movedOnAt?: string             // ← add
}
```

**Step 2: Add `moveOnFromDeepBlock` action in `src/store/helpers.ts`**

Read the file first. Find `completeDeepBlock` in `makePlanActions`. Add `moveOnFromDeepBlock` directly after it, following the exact same pattern:

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

Also add it to the return object of `makePlanActions`.

**Step 3: Add to `VandaagState` in `src/store/types.ts`**

Find `completeDeepBlock: (projectTitle: string) => void` and add directly below:
```ts
moveOnFromDeepBlock: (projectTitle: string) => void
```

**Step 4: Wire in `src/store/plansSlice.ts`**

Find `completeDeepBlock: todayActions.completeDeepBlock` and add directly below:
```ts
moveOnFromDeepBlock: todayActions.moveOnFromDeepBlock,
```

**Step 5: Add to `src/hooks/useTodayPlan.ts`**

Find `const completeDeepBlock = useStore(s => s.completeDeepBlock)` and add:
```ts
const moveOnFromDeepBlock = useStore(s => s.moveOnFromDeepBlock)
```

Find `completeDeepBlock,` in the return object and add:
```ts
moveOnFromDeepBlock,
```

**Step 6: Build**
```bash
cd "/Users/beer/Vandaag App" && npm run build 2>&1 | tail -5
```
Expected: `✓ built in ...`

**Step 7: Commit**
```bash
git add src/types/index.ts src/store/helpers.ts src/store/types.ts src/store/plansSlice.ts src/hooks/useTodayPlan.ts
git commit -m "feat: add moveOnFromDeepBlock store action"
```

---

### Task 3: Update DeepBlock.tsx — button + state + component

**Files:**
- Modify: `src/components/vandaag/DeepBlock.tsx`

Read the full file before making any changes.

**Step 1: Add import**

`getMovedOnQuote` needs to be imported. Find the existing quotes import:
```ts
import { getTodayQuote } from '../../lib/quotes'
```
Change to:
```ts
import { getTodayQuote, getMovedOnQuote } from '../../lib/quotes'
```

**Step 2: Add `moveOnFromDeepBlock` store selector**

Find `const completeDeepBlock = useStore(s => s.completeDeepBlock)` and add below:
```ts
const moveOnFromDeepBlock = useStore(s => s.moveOnFromDeepBlock)
```

**Step 3: Add `isMovedOn` derived state**

Find:
```ts
const isDoneToday = !!(completedProjectTitle && dailyPlan?.deepBlock.completedAt)
```
Add directly below:
```ts
const movedOnProjectTitle = dailyPlan?.deepBlock.movedOnProjectTitle
const isMovedOn = !!(movedOnProjectTitle && dailyPlan?.deepBlock.movedOnAt)
```

**Step 4: Replace `handleClear` with `handleMoveOn`**

Find:
```ts
function handleClear() {
  clearDeepBlock()
  setIntention('')
}
```
Replace with:
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

**Step 5: Update the × button**

Find the × button (currently calls `handleClear`). Replace the entire button element with a hover-expand version:

```tsx
<button
  onClick={handleMoveOn}
  className="group flex items-center gap-1 text-stone/40
    hover:text-amber-700/50 transition-colors p-1"
  title="Moving on"
>
  <X size={14} />
  <span className="overflow-hidden max-w-0 group-hover:max-w-[80px]
    transition-all duration-200 ease-out
    text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100">
    Moving on
  </span>
</button>
```

**Step 6: Update the `isDoneToday` gate in JSX**

Find the line:
```tsx
{isDoneToday ? (
  <DeepBlockComplete projectTitle={completedProjectTitle!} />
) : (
```
Replace with:
```tsx
{isDoneToday ? (
  <DeepBlockComplete projectTitle={completedProjectTitle!} />
) : isMovedOn ? (
  <DeepBlockMovedOn projectTitle={movedOnProjectTitle!} />
) : (
```
Keep the existing content and closing unchanged — just add the new branch.

**Step 7: Add `DeepBlockMovedOn` component**

Add this new inline component at the bottom of the file, right after `DeepBlockComplete` (before or after the export, whichever is cleaner):

```tsx
function DeepBlockMovedOn({ projectTitle }: { projectTitle: string }) {
  const quote = getMovedOnQuote()
  return (
    <div
      className="flex flex-col items-center justify-center py-8 px-6 text-center"
      style={{ minHeight: '200px' }}
    >
      {/* Animated arrow */}
      <div
        className="mb-4"
        style={{
          animation: 'deepBlockComplete 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          color: 'var(--color-stone, #7A746A)',
          opacity: 0.5,
          fontSize: '22px',
        }}
      >
        →
      </div>

      {/* Project title + label */}
      <div
        style={{
          animation: 'fadeUpIn 0.4s ease forwards',
          animationDelay: '0.15s',
          opacity: 0,
        }}
      >
        <p className="font-serif text-[18px] text-charcoal tracking-[-0.01em] mb-1">
          {projectTitle}
        </p>
        <p className="text-[10px] uppercase tracking-[0.1em] text-stone/50 mb-5">
          Day ran differently — that's fine
        </p>
      </div>

      {/* Burkeman quote */}
      <div
        className="max-w-[280px]"
        style={{
          animation: 'fadeUpIn 0.4s ease forwards',
          animationDelay: '0.3s',
          opacity: 0,
        }}
      >
        <p className="font-serif text-[12px] text-stone/60 italic leading-relaxed mb-1.5">
          "{quote.text}"
        </p>
        {quote.source && (
          <p className="text-[10px] text-stone/40">
            — Oliver Burkeman, {quote.source}
          </p>
        )}
      </div>
    </div>
  )
}
```

**Step 8: Build**
```bash
cd "/Users/beer/Vandaag App" && npm run build 2>&1 | tail -5
```
Expected: `✓ built in ...`

**Step 9: Commit**
```bash
git add src/components/vandaag/DeepBlock.tsx
git commit -m "feat: deep block moving-on state with hover button and Burkeman quote"
```

---

### Task 4: Update MEMORY.md

**Files:**
- Modify: `/Users/beer/.claude/projects/-Users-beer-Vandaag-App/memory/MEMORY.md`

**Step 1: Add philosophy section**

Read the file first. Find the `## Key Patterns` section. Add a new `## Philosophy & Tone` section after `## Key Patterns`:

```markdown
## Philosophy & Tone
- The 3-3-3 (deep block + 3 short + 3 maintenance) is a *guide*, not a contract — days run differently and that's expected
- The app's tone is warm and supportive, never performance-tracking or demanding
- Oliver Burkeman's core message: finitude is real, accept limits with grace, "enough" is a valid endpoint
- Deep block has two terminal states: ✓ done (green checkmark) and → moving on (muted arrow) — both are valid
- UI copy should reflect that the 3-3-3 is a starting intention, not a checklist to complete
```

**Step 2: Commit**
```bash
git add "/Users/beer/.claude/projects/-Users-beer-Vandaag-App/memory/MEMORY.md"
git commit -m "docs: add philosophy and tone guidelines to MEMORY.md"
```

---

### Task 5: Verify in preview

1. Select a deep block project
2. Hover the × button → "Moving on" label should slide in with amber tint
3. Click → block shows arrow + project title + "Day ran differently — that's fine" + Burkeman quote with fadeUpIn animation
4. Refresh → state persists
5. Done state still works: click ✓ → green checkmark + completion card
6. No console errors
