import { useState } from 'react'
import { getWindDownQuote } from '../../lib/quotes'

interface WindDownBannerProps {
  onEnough: () => void
}

export function WindDownBanner({ onEnough }: WindDownBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const [quote] = useState(() => getWindDownQuote())

  if (dismissed) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-6 px-4 pointer-events-none animate-wind-down-in">
      <div
        className="pointer-events-auto max-w-[440px] w-full rounded-[14px]
          bg-charcoal text-canvas px-6 py-5
          shadow-[0_8px_40px_rgba(42,39,36,0.25)]"
      >
        {/* Quote */}
        <p className="font-serif text-[15px] sm:text-[16px] italic text-canvas/70 leading-relaxed mb-1">
          &ldquo;{quote.text}&rdquo;
        </p>
        {quote.source && (
          <p className="text-[11px] text-canvas/30 mb-5">
            &mdash; {quote.source}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setDismissed(true)}
            className="text-[12px] text-canvas/25 hover:text-canvas/40 transition-colors py-1"
          >
            Not yet
          </button>
          <button
            onClick={onEnough}
            className="px-5 py-2.5 rounded-[8px] bg-canvas/10 text-canvas
              text-[14px] font-serif italic tracking-[-0.01em]
              hover:bg-canvas/15 transition-all"
          >
            Enough.
          </button>
        </div>
      </div>

      <style>{`
        @keyframes wind-down-in {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-wind-down-in {
          animation: wind-down-in 600ms cubic-bezier(0.32, 0.72, 0, 1) both;
        }
      `}</style>
    </div>
  )
}
