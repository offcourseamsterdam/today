import { PlanningModal } from '../planning/PlanningModal'

interface PlanningModeProps {
  onExit: () => void
}

export function PlanningMode({ onExit }: PlanningModeProps) {
  return <PlanningModal onClose={onExit} day="tomorrow" />
}
