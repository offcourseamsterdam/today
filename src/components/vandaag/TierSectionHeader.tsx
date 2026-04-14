import { Target, CheckCircle, RotateCcw } from 'lucide-react'
import type { Tier } from '../../types'
import { useVandaagDark } from './VandaagDarkContext'

const TIER_CONFIG: Record<Tier, { icon: typeof Target; label: string; lightColor: string; darkColor: string }> = {
  deep: { icon: Target, label: 'DEEP BLOCK', lightColor: 'text-indigo-600/60', darkColor: 'text-indigo-400/50' },
  short: { icon: CheckCircle, label: 'SHORT THREE', lightColor: 'text-amber-600/60', darkColor: 'text-amber-400/50' },
  maintenance: { icon: RotateCcw, label: 'MAINTENANCE', lightColor: 'text-stone/40', darkColor: 'text-citadel-text/30' },
}

interface TierSectionHeaderProps {
  tier: Tier
  slotCount: number
  slotMax?: number
}

export function TierSectionHeader({ tier, slotCount, slotMax }: TierSectionHeaderProps) {
  const { icon: Icon, label, lightColor, darkColor } = TIER_CONFIG[tier]
  const dark = useVandaagDark()
  const color = dark ? darkColor : lightColor
  return (
    <div className="flex items-center gap-2 py-2 mt-2 first:mt-0">
      <Icon size={12} className={color} />
      <span className={`text-[10px] uppercase tracking-[0.08em] font-medium ${color}`}>
        {label}
      </span>
      {slotMax != null && (
        <span className={`text-[10px] ${dark ? 'text-citadel-text/20' : 'text-stone/30'}`}>{slotCount}/{slotMax}</span>
      )}
    </div>
  )
}
