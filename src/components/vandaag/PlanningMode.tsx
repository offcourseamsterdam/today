import { PlanningModal } from '../planning/PlanningModal'

interface PlanningModeProps {
  onExit: () => void
  day?: 'today' | 'tomorrow'
}

export function PlanningMode({ onExit, day = 'tomorrow' }: PlanningModeProps) {
  return <PlanningModal onClose={onExit} day={day} />
}
