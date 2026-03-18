interface DropGhostProps {
  height: number
}

export function DropGhost({ height }: DropGhostProps) {
  return (
    <div
      className="mb-3 rounded-[8px] border-2 border-dashed border-stone/30 transition-all duration-150"
      style={{ height }}
    />
  )
}
