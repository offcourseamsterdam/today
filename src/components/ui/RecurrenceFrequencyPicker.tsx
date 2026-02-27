import type { RecurrenceFrequency } from '../../types'
import { DAY_LABELS, WEEK_LABELS, FREQ_OPTIONS } from '../../lib/recurrence'

export type RecurrenceFormState = {
  freq: RecurrenceFrequency
  weeklyDay: number
  monthlyDate: number
  monthlyWeek: number
  monthlyDay: number
  customDays: number[]
}

export const EMPTY_RULE_STATE: RecurrenceFormState = {
  freq: 'daily',
  weeklyDay: 1,
  monthlyDate: 1,
  monthlyWeek: 1,
  monthlyDay: 1,
  customDays: [],
}

interface RecurrenceFrequencyPickerProps {
  value: RecurrenceFormState
  onChange: (patch: Partial<RecurrenceFormState>) => void
}

/** Renders the frequency-type button row and the matching sub-controls. */
export function RecurrenceFrequencyPicker({ value, onChange }: RecurrenceFrequencyPickerProps) {
  const { freq, weeklyDay, monthlyDate, monthlyWeek, monthlyDay, customDays } = value

  function toggleCustomDay(day: number) {
    const next = customDays.includes(day)
      ? customDays.filter(d => d !== day)
      : [...customDays, day].sort((a, b) => a - b)
    onChange({ customDays: next })
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
    </>
  )
}
