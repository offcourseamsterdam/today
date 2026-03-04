interface ToggleSwitchProps {
  active: boolean
  onChange: () => void
  activeColor?: string
}

export function ToggleSwitch({ active, onChange, activeColor = 'bg-green' }: ToggleSwitchProps) {
  return (
    <button
      onClick={onChange}
      className={`w-9 h-5 rounded-full transition-colors duration-200 relative
        ${active ? activeColor : 'bg-border'}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow-sm transition-transform duration-200
          ${active ? 'translate-x-4' : 'translate-x-0.5'}`}
      />
    </button>
  )
}
