import { CATEGORY_CONFIG, type Category } from '../../types'

interface CategoryBadgeProps {
  category: Category
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category]

  return (
    <span
      className="text-[10px] uppercase tracking-[0.06em] font-medium px-2 py-0.5 rounded-full"
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  )
}
