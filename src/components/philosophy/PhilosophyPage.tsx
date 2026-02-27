import { useState } from 'react'
import { ArrowLeft, Plus, X, Pencil, Check } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { useStore } from '../../store'
import { calculateLifeWeeks, getPercentageLived, getYearsFromWeeks, TOTAL_WEEKS, WEEKS_PER_YEAR } from '../../lib/lifeweeks'
import { BURKEMAN_QUOTES } from '../../lib/quotes'

interface PhilosophyPageProps {
  onBack: () => void
}

export function PhilosophyPage({ onBack }: PhilosophyPageProps) {
  const settings = useStore(s => s.settings)
  const updateSettings = useStore(s => s.updateSettings)
  const updateSettingsWithLimitTracking = useStore(s => s.updateSettingsWithLimitTracking)
  const personalRules = useStore(s => s.personalRules)
  const addPersonalRule = useStore(s => s.addPersonalRule)
  const updatePersonalRule = useStore(s => s.updatePersonalRule)
  const deletePersonalRule = useStore(s => s.deletePersonalRule)

  const [newRule, setNewRule] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')
  const [birthInput, setBirthInput] = useState(settings.birthDate || '')
  const [newCompany, setNewCompany] = useState('')
  const [wipLimitInput, setWipLimitInput] = useState(String(settings.inProgressLimit))
  const [showWipWarning, setShowWipWarning] = useState(false)

  const contexts = settings.contexts ?? []

  function countRecentChanges(log: string[]): number {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return (log ?? []).filter(d => new Date(d) > sevenDaysAgo).length
  }

  function handleWipLimitBlur() {
    const num = parseInt(wipLimitInput, 10)
    if (!Number.isFinite(num) || num < 1) {
      setWipLimitInput(String(settings.inProgressLimit))
      return
    }
    if (num === settings.inProgressLimit) return
    const recentChanges = countRecentChanges(settings.inProgressLimitChangeLog)
    if (recentChanges >= 3) {
      setShowWipWarning(true)
    } else {
      setShowWipWarning(false)
    }
    updateSettingsWithLimitTracking(num)
  }

  function handleAddContext() {
    const trimmed = newCompany.trim()
    if (!trimmed) return
    updateSettings({ contexts: [...contexts, { id: uuid(), name: trimmed }] })
    setNewCompany('')
  }

  function handleDeleteContext(id: string) {
    updateSettings({ contexts: contexts.filter(c => c.id !== id) })
  }

  const lifeWeeks = settings.birthDate ? calculateLifeWeeks(settings.birthDate) : null

  const handleSaveBirthDate = () => {
    if (birthInput) {
      updateSettings({ birthDate: birthInput })
    }
  }

  const handleAddRule = () => {
    const trimmed = newRule.trim()
    if (!trimmed) return
    addPersonalRule(trimmed)
    setNewRule('')
  }

  const handleStartEdit = (index: number) => {
    setEditingIndex(index)
    setEditingText(personalRules[index])
  }

  const handleSaveEdit = () => {
    if (editingIndex === null) return
    const trimmed = editingText.trim()
    if (trimmed) {
      updatePersonalRule(editingIndex, trimmed)
    }
    setEditingIndex(null)
    setEditingText('')
  }

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in">
      {/* Back navigation */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-stone hover:text-charcoal transition-colors mb-8 group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        <span className="text-[12px] uppercase tracking-[0.06em]">Back to today</span>
      </button>

      {/* Page title */}
      <div className="mb-10">
        <h2 className="font-serif text-[28px] text-charcoal tracking-[-0.02em] font-normal">
          Four Thousand Weeks
        </h2>
        <p className="text-[13px] text-stone mt-1 max-w-[520px] leading-relaxed">
          The average human lifespan is roughly four thousand weeks.
          This is your time. Use it on what matters.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-[1fr_380px] gap-10">
        {/* Left: Life grid */}
        <div>
          {/* Birth date input */}
          {!settings.birthDate ? (
            <div className="bg-card rounded-[10px] border border-border p-6 shadow-card mb-6">
              <p className="text-[13px] text-charcoal mb-3">
                Enter your birth date to see your weeks.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={birthInput}
                  onChange={e => setBirthInput(e.target.value)}
                  className="px-3 py-2 text-[13px] border border-border rounded-[6px] bg-canvas
                    text-charcoal focus:outline-none focus:border-stone/40 transition-colors"
                />
                <button
                  onClick={handleSaveBirthDate}
                  disabled={!birthInput}
                  className="px-4 py-2 text-[12px] bg-charcoal text-canvas rounded-[6px]
                    hover:bg-charcoal/90 transition-colors disabled:opacity-40"
                >
                  Set birth date
                </button>
              </div>
            </div>
          ) : lifeWeeks ? (
            <>
              {/* Stats row */}
              <div className="flex items-baseline gap-8 mb-6">
                <div>
                  <span className="text-[32px] font-serif text-charcoal tracking-tight">
                    {lifeWeeks.weeksLived.toLocaleString()}
                  </span>
                  <span className="text-[13px] text-stone ml-2">weeks lived</span>
                </div>
                <div>
                  <span className="text-[20px] font-serif text-stone">
                    {lifeWeeks.weeksRemaining.toLocaleString()}
                  </span>
                  <span className="text-[12px] text-stone/60 ml-2">remaining</span>
                </div>
                <div className="text-[12px] text-stone/50">
                  {getPercentageLived(lifeWeeks.weeksLived).toFixed(1)}% of 4,000
                </div>
              </div>

              {/* The grid */}
              <LifeGrid weeksLived={lifeWeeks.weeksLived} />

              {/* Year labels + change birth date */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-4 text-[10px] text-stone/50">
                  <span>Each dot = 1 week</span>
                  <span>Each row = 1 year ({WEEKS_PER_YEAR} weeks)</span>
                </div>
                <button
                  onClick={() => updateSettings({ birthDate: undefined })}
                  className="text-[11px] text-stone/40 hover:text-stone transition-colors"
                >
                  Change birth date
                </button>
              </div>
            </>
          ) : null}
        </div>

        {/* Right: Philosophy + Rules */}
        <div className="space-y-6">
          {/* Core principles */}
          <div className="bg-card rounded-[10px] border border-border p-5 shadow-card">
            <h3 className="text-[11px] uppercase tracking-[0.08em] text-stone/60 font-medium mb-4">
              Core principles
            </h3>
            <div className="space-y-4">
              {CORE_PRINCIPLES.map((p, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-[11px] text-stone/30 font-serif mt-0.5 shrink-0 w-4 text-right">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[13px] text-charcoal leading-relaxed">{p.title}</p>
                    <p className="text-[11px] text-stone/60 mt-0.5 leading-relaxed">{p.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Personal rules */}
          <div className="bg-card rounded-[10px] border border-border p-5 shadow-card">
            <h3 className="text-[11px] uppercase tracking-[0.08em] text-stone/60 font-medium mb-4">
              My rules
            </h3>
            <div className="space-y-2">
              {personalRules.map((rule, i) => (
                <div key={i} className="flex items-start gap-2 group">
                  <span className="text-[11px] text-stone/30 font-serif mt-1 shrink-0 w-4 text-right">
                    {i + 1}
                  </span>
                  {editingIndex === i ? (
                    <div className="flex-1 flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editingText}
                        onChange={e => setEditingText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                        autoFocus
                        className="flex-1 px-2 py-1 text-[13px] border border-border rounded bg-canvas
                          text-charcoal focus:outline-none focus:border-stone/40"
                      />
                      <button onClick={handleSaveEdit} className="text-green hover:text-green/80 p-0.5">
                        <Check size={13} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="flex-1 text-[13px] text-charcoal leading-relaxed">{rule}</p>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                        <button
                          onClick={() => handleStartEdit(i)}
                          className="text-stone/40 hover:text-stone p-0.5"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          onClick={() => deletePersonalRule(i)}
                          className="text-stone/40 hover:text-red p-0.5"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {/* Add new rule */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-light">
                <input
                  type="text"
                  value={newRule}
                  onChange={e => setNewRule(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddRule()}
                  placeholder="Add a personal rule..."
                  className="flex-1 px-2 py-1.5 text-[13px] bg-transparent text-charcoal
                    placeholder:text-stone/30 focus:outline-none"
                />
                <button
                  onClick={handleAddRule}
                  disabled={!newRule.trim()}
                  className="text-stone/40 hover:text-charcoal transition-colors disabled:opacity-30"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Context */}
          <div className="bg-card rounded-[10px] border border-border p-5 shadow-card">
            <h3 className="text-[11px] uppercase tracking-[0.08em] text-stone/60 font-medium mb-4">
              Context
            </h3>
            <div className="space-y-2">
              {contexts.map(ctx => (
                <div key={ctx.id} className="flex items-center gap-2 group">
                  <span className="flex-1 text-[13px] text-charcoal leading-relaxed">{ctx.name}</span>
                  <button
                    onClick={() => handleDeleteContext(ctx.id)}
                    className="opacity-0 group-hover:opacity-100 text-stone/40 hover:text-red p-0.5 transition-opacity"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}

              {/* Add new context */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-light">
                <input
                  type="text"
                  value={newCompany}
                  onChange={e => setNewCompany(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddContext()}
                  placeholder="Voeg context toe..."
                  className="flex-1 px-2 py-1.5 text-[13px] bg-transparent text-charcoal
                    placeholder:text-stone/30 focus:outline-none"
                />
                <button
                  onClick={handleAddContext}
                  disabled={!newCompany.trim()}
                  className="text-stone/40 hover:text-charcoal transition-colors disabled:opacity-30"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Instellingen */}
          <div className="bg-card rounded-[10px] border border-border p-5 shadow-card">
            <h3 className="text-[11px] uppercase tracking-[0.08em] text-stone/60 font-medium mb-4">
              Instellingen
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[13px] text-charcoal">WIP limiet</span>
                <span className="text-[11px] text-stone/50 ml-2">bezig + wachtend</span>
              </div>
              <input
                type="number"
                min={1}
                max={20}
                value={wipLimitInput}
                onChange={e => setWipLimitInput(e.target.value)}
                onBlur={handleWipLimitBlur}
                onKeyDown={e => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
                className="w-14 px-2 py-1 text-[13px] text-center border border-border
                  rounded-[6px] bg-canvas text-charcoal
                  focus:outline-none focus:border-stone/40 transition-colors"
              />
            </div>
            {showWipWarning && (
              <p className="text-[11px] text-[var(--color-status-amber-text)] mt-2 leading-relaxed">
                Je past dit te vaak aan. Kies een limiet en houd je eraan.
              </p>
            )}
            <p className="text-[11px] text-stone/35 mt-2 leading-relaxed">
              Let op: pas dit niet te vaak aan.
            </p>
          </div>

          {/* Random quote */}
          <div className="p-4 rounded-[8px] bg-border-light/40">
            <QuoteRotator />
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- Life Grid ----

function LifeGrid({ weeksLived }: { weeksLived: number }) {
  const totalYears = Math.ceil(TOTAL_WEEKS / WEEKS_PER_YEAR)
  const currentYear = getYearsFromWeeks(weeksLived)
  const weekInCurrentYear = weeksLived % WEEKS_PER_YEAR

  return (
    <div className="bg-card rounded-[10px] border border-border p-5 shadow-card overflow-x-auto">
      <div className="inline-grid gap-y-[2px]" style={{ gridTemplateColumns: `20px repeat(${WEEKS_PER_YEAR}, 1fr)` }}>
        {Array.from({ length: totalYears }, (_, yearIdx) => {
          const yearStart = yearIdx * WEEKS_PER_YEAR
          const isCurrentYearRow = yearIdx === currentYear
          const showLabel = yearIdx % 10 === 0

          return (
            <div key={yearIdx} className="contents">
              {/* Year label */}
              <div className="flex items-center justify-end pr-1.5">
                {showLabel && (
                  <span className="text-[8px] text-stone/30">{yearIdx}</span>
                )}
              </div>
              {/* Week dots */}
              {Array.from({ length: WEEKS_PER_YEAR }, (_, weekIdx) => {
                const weekNumber = yearStart + weekIdx
                const isLived = weekNumber < weeksLived
                const isCurrent = isCurrentYearRow && weekIdx === weekInCurrentYear

                return (
                  <div
                    key={weekIdx}
                    className={`w-[5px] h-[5px] rounded-[1px] transition-colors ${
                      isCurrent
                        ? 'bg-citadel-accent ring-1 ring-citadel-accent/40'
                        : isLived
                          ? 'bg-charcoal/25'
                          : 'bg-border-light'
                    }`}
                    title={`Year ${yearIdx}, Week ${weekIdx + 1}${isCurrent ? ' (now)' : ''}`}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---- Quote Rotator ----

function QuoteRotator() {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * BURKEMAN_QUOTES.length))
  const quote = BURKEMAN_QUOTES[idx]

  return (
    <div
      className="cursor-pointer"
      onClick={() => setIdx((idx + 1) % BURKEMAN_QUOTES.length)}
      title="Click for another quote"
    >
      <p className="text-[11px] text-[#5A5550] italic font-serif leading-relaxed">
        &ldquo;{quote.text}&rdquo;
      </p>
      {quote.source && (
        <p className="text-[10px] text-stone/40 mt-1">
          Oliver Burkeman &mdash; {quote.source}
        </p>
      )}
      <p className="text-[9px] text-stone/25 mt-2">click for another</p>
    </div>
  )
}

// ---- Core Principles ----

const CORE_PRINCIPLES = [
  {
    title: 'You will never get it all done.',
    detail: 'Accept finitude. Choose what matters and let the rest go.',
  },
  {
    title: 'Limit your work in progress.',
    detail: 'A hard upper bound forces you to finish before starting something new.',
  },
  {
    title: 'Three or four hours of deep work is enough.',
    detail: 'Don\u2019t chase an eight-hour creative marathon. Do your best work, then stop.',
  },
  {
    title: 'Pay yourself first with time.',
    detail: 'Do the important thing before the urgent ones crowd it out.',
  },
  {
    title: 'Embrace the discomfort of doing what matters.',
    detail: 'Meaningful work feels hard. That\u2019s the signal you\u2019re in the right place.',
  },
]
