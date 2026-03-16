interface EnsoLogoProps {
  size?: number
  color?: string
  strokeWidth?: number
  className?: string
}

/**
 * Enso — the zen circle.
 * Uses circle + stroke-dasharray so the gap is perfectly crisp.
 * Gap: ~35° at the top (252.5° → 287.5°). strokeWidth in viewBox units.
 * Rotation: -107.5° places the gap centered at the top (270°).
 *
 * Circumference = 2π×12 ≈ 75.40
 * Drawn arc  = 325/360 × 75.40 ≈ 68.07
 * Gap arc    =  35/360 × 75.40 ≈  7.33
 */
export function EnsoLogo({
  size = 28,
  color = 'currentColor',
  strokeWidth = 3,
  className,
}: EnsoLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle
        cx="16"
        cy="16"
        r="12"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray="68.07 7.33"
        transform="rotate(-107.5 16 16)"
      />
    </svg>
  )
}
