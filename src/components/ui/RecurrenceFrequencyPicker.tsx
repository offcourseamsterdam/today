import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { RecurrenceFrequency } from '../../types'
import { DAY_LABELS, WEEK_LABELS, FREQ_OPTIONS, MONTH_LABELS } from '../../lib/recurrence'

export type RecurrenceFormState = {
  freq: RecurrenceFrequency
  weeklyDay: number
  monthlyDate: number
  monthlyWeek: number
  monthlyDay: number
  customDays: number[]
  annualDates: { month: number; day: number }[]
}

export const EMPTY_RULE_STATE: RecurrenceFormState = {
  freq: 'daily',
  weeklyDay: 1,
  monthlyDate: 1,
  monthlyWeek: 1,
  monthlyDay: 1,
  customDays: [],
  annualDates: [],
}

interface RecurrenceFrequencyPickerProps {
  value: RecurrenceFormState
  onChange: (patch: Partial<RecurrenceFormState>) => void
}

/** Renders the frequency-type button row and the matching sub-controls. */
export function RecurrenceFrequencyPicker({ value, onChange }: RecurrenceFrequencyPickerProps) {
  const { freq, weeklyDay, monthlyDate, monthlyWeek, monthlyDay, customDays, annualDates } = value
  const [pendingMonth, setPendingMonth] = useState(1)
  const [pendingDay, setPendingDay] = useState(1)

  function toggleCustomDay(day: number) {
    const next = customDays.includes(day)
      ? customDays.filter(d => d !== day)
      : [...customDays, day].sort((a, b) => a - b)
    onChange({ customDays: next })
  }

  function addAnnualDate() {
    if (annualDates.some(d => d.month === pendingMonth && d.day === pendingDay)) return
    const next = [...annualDates, { month: pendingMonth, day: pendingDay }]
      .sort((a, b) => a.month - b.month || a.day - b.day)
    onChange({ annualDates: next })
  }

  function removeAnnualDate(index: number) {
    onChange({ annualDates: annualDates.filter((_, i) => i !== index) })
  }

  return (
    <>
      {/* Frequency type buttons */}
      <div className="flex flex-wrap gap-1">
        {FREQ_OPTIONS.map(opt => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange({ freq: opt.key })}
            className={`text-[10px] px-2 py-1 rounded-full border transition-all
              ${freq === opt.key
                ? 'border-charcoal bg-charcoal text-canvas'
                : 'border-border text-stone hover:border-stone/40'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Sub-controls */}
      {freq === 'weekly' && (
        <div>
          <div className="text-[10px] text-stone/50 mb-1.5">Every</div>
          <div className="flex gap-1 flex-wrap">
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onChange({ weeklyDay: i })}
                className={`text-[10px] px-2 py-1 rounded border transition-all
                  ${weeklyDay === i
                    ? 'border-charcoal bg-charcoal text-canvas'
                    : 'border-border text-stone hover:border-stone/40'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {freq === 'monthly_date' && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-stone">Day</span>
          <input
            type="number"
            min={1}
            max={31}
            value={monthlyDate}
            onChange={e => onChange({ monthlyDate: Math.min(31, Math.max(1, Number(e.target.value))) })}
            className="w-14 text-[12px] text-charcoal text-center px-2 py-1 rounded border
              border-border bg-card outline-none focus:border-stone/40 transition-colors"
          />
          <span className="text-[11px] text-stone">of each month</span>
        </div>
      )}

      {freq === 'monthly_weekday' && (
        <div className="space-y-2">
          <div>
            <div className="text-[10px] text-stone/50 mb-1.5">Which occurrence</div>
            <div className="flex gap-1">
              {WEEK_LABELS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onChange({ monthlyWeek: i + 1 })}
                  className={`text-[10px] px-2 py-1 rounded border transition-all
                    ${monthlyWeek === i + 1
                      ? 'border-charcoal bg-charcoal text-canvas'
                      : 'border-border text-stone hover:border-stone/40'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-stone/50 mb-1.5">Which day</div>
            <div className="flex gap-1 flex-wrap">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onChange({ monthlyDay: i })}
                  className={`text-[10px] px-2 py-1 rounded border transition-all
                    ${monthlyDay === i
                      ? 'border-charcoal bg-charcoal text-canvas'
                      : 'border-border text-stone hover:border-stone/40'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="text-[10px] text-stone/50 italic">
            → {WEEK_LABELS[monthlyWeek - 1]} {DAY_LABELS[monthlyDay]} of each month
          </div>
        </div>
      )}

      {freq === 'custom' && (
        <div>
          <div className="text-[10px] text-stone/50 mb-1.5">Select days</div>
          <div className="flex gap-1 flex-wrap">
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleCustomDay(i)}
                className={`text-[10px] px-2 py-1 rounded border transition-all
                  ${customDays.includes(i)
                    ? 'border-charcoal bg-charcoal text-canvas'
                    : 'border-border text-stone hover:border-stone/40'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {freq === 'annual_dates' && (
        <div className="space-y-2">
          <div className="text-[10px] text-stone/50">Dates in the year</div>

          {/* Existing date chips */}
          {annualDates.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {annualDates.map((d, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full
                    border border-charcoal bg-charcoal text-canvas"
                >
                  {MONTH_LABELS[d.month - 1]} {d.day}
                  <button
                    type="button"
                    onClick={() => removeAnnualDate(i)}
                    className="hover:opacity-70 transition-opacity"
                  >
                    <X size={9} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add row */}
          <div className="flex items-center gap-1.5">
            <select
              value={pendingMonth}
              onChange={e => setPendingMonth(Number(e.target.value))}
              className="text-[11px] text-charcoal bg-card border border-border rounded px-1.5 py-1
                outline-none focus:border-stone/40 transition-colors"
            >
              {MONTH_LABELS.map((label, i) => (
                <option key={i} value={i + 1}>{label}</option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              max={31}
              value={pendingDay}
              onChange={e => setPendingDay(Math.min(31, Math.max(1, Number(e.target.value))))}
              className="w-12 text-[11px] text-charcoal text-center bg-card border border-border rounded
                px-1.5 py-1 outline-none focus:border-stone/40 transition-colors"
            />
            <button
              type="button"
              onClick={addAnnualDate}
              className="flex items-center gap-1 text-[10px] text-stone/50 hover:text-stone
                border border-border/50 hover:border-stone/30 px-2 py-1 rounded transition-all"
            >
              <Plus size={10} />
              Add
            </button>
          </div>
          {annualDates.length === 0 && (
            <div className="text-[10px] text-stone/30 italic">No dates added yet</div>
          )}
        </div>
      )}
    </>
  )
}
