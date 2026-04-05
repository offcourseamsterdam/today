import { Target, CheckCircle, RotateCcw } from 'lucide-react'

type Tier = 'deep' | 'short' | 'maintenance'

const TIER_CONFIG: Record<Tier, { icon: typeof Target; label: string; color: string }> = {
  deep: { icon: Target, label: 'DEEP BLOCK', color: 'text-indigo-600/60' },
  short: { icon: CheckCircle, label: 'SHORT THREE', color: 'text-amber-600/60' },
  maintenance: { icon: RotateCcw, label: 'MAINTENANCE', color: 'text-stone/40' },
}

interface TierSectionHeaderProps {
  tier: Tier
  slotCount: number
  slotMax?: number
}

export function TierSectionHeader({ tier, slotCount, slotMax }: TierSectionHeaderProps) {
  const { icon: Icon, label, color } = TIER_CONFIG[tier]
  return (
    <div className="flex items-center gap-2 py-2 mt-2 first:mt-0">
      <Icon size={12} className={color} />
      <span className={`text-[10px] uppercase tracking-[0.08em] font-medium ${color}`}>
        {label}
      </span>
      {slotMax != null && (
        <span className="text-[10px] text-stone/30">{slotCount}/{slotMax}</span>
      )}
    </div>
  )
}
