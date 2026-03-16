interface StepIndicatorProps {
  currentStep: number
}

const STEPS = [
  { label: 'Calendar' },
  { label: 'Deep Block' },
  { label: 'Short Three' },
  { label: 'Maintenance' },
]

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-start gap-0 mb-6">
      {STEPS.map((step, idx) => {
        const stepNum = idx + 1
        const isDone = stepNum < currentStep
        const isActive = stepNum === currentStep

        return (
          <div key={stepNum} className="flex items-start flex-1">
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div
                className={`w-2 h-2 rounded-full transition-all ${
                  isActive
                    ? 'bg-[#2A2724]'
                    : isDone
                      ? 'bg-[#2A2724] opacity-50'
                      : 'border border-[#E8E4DD] bg-transparent'
                }`}
              />
              <span
                className={`text-[10px] uppercase tracking-wider whitespace-nowrap ${
                  isActive ? 'text-[#2A2724]' : 'text-[#7A746A]/50'
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className="h-px flex-1 bg-[#E8E4DD] mt-[3.5px] mx-1" />
            )}
          </div>
        )
      })}
    </div>
  )
}
