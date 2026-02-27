interface TaskCheckboxProps {
  checked: boolean
  onChange: () => void
  /** 'sm' = 16px, 'md' = 18px (default) */
  size?: 'sm' | 'md'
  /** CSS color string for the checked state background + border */
  color?: string
}

export function TaskCheckbox({
  checked,
  onChange,
  size = 'md',
  color = 'var(--color-green)',
}: TaskCheckboxProps) {
  const dim = size === 'sm' ? 'w-[16px] h-[16px]' : 'w-[18px] h-[18px]'
  const svgSize = size === 'sm' ? 9 : 10

  return (
    <button
      onClick={onChange}
      className={`${dim} rounded border-[1.5px] flex-shrink-0
        flex items-center justify-center transition-all duration-150
        ${checked ? '' : 'border-stone/25 hover:border-stone/40'}`}
      style={checked ? { background: color, borderColor: color } : undefined}
    >
      {checked && (
        <svg width={svgSize} height={svgSize} viewBox="0 0 10 10" fill="none">
          <path
            d="M2 5L4.5 7.5L8 3"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  )
}
