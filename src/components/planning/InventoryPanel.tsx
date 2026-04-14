import { useState, useMemo } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Search, ChevronDown, ChevronRight, Clock, Plus } from 'lucide-react'
import { useStore } from '../../store'
import { getAvailableTasks } from '../../lib/availableTasks'
import { CATEGORY_CONFIG, type Project, type Task, type Meeting } from '../../types'
import { CategoryBadge } from '../ui/CategoryBadge'
import { isDueToday } from '../../lib/recurrence'
import { getTodayString, getTomorrowString } from '../../store/helpers'

interface InventoryPanelProps {
  allAssignedIds: Set<string>
  day?: 'today' | 'tomorrow'
}

// ─── Draggable Project Card ─────────────────────────────────────
function DraggableProjectCard({ project, isAssigned }: { project: Project; isAssigned: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `project-${project.id}`,
    data: { type: 'project' as const, id: project.id },
  })
  const catConfig = CATEGORY_CONFIG[project.category]

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] border border-[#E8E4DD] bg-white
        transition-all duration-150 select-none
        ${isDragging ? 'opacity-0 pointer-events-none' : ''}
        ${isAssigned && !isDragging ? 'opacity-30' : ''}
        ${!isAssigned && !isDragging ? 'cursor-grab hover:border-[#2A2724]/20 hover:shadow-sm active:cursor-grabbing' : ''}`}
    >
      {project.coverImageUrl ? (
        <div className="w-8 h-8 rounded-[4px] overflow-hidden flex-shrink-0">
          <img src={project.coverImageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-8 h-8 rounded-[4px] flex-shrink-0" style={{ background: catConfig.bg }} />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-[#2A2724] truncate">{project.title}</div>
        <div className="mt-0.5">
          <CategoryBadge category={project.category} />
        </div>
      </div>
    </div>
  )
}

// ─── Draggable Task Row ─────────────────────────────────────────
function DraggableTaskRow({ task, projectTitle, isAssigned }: { task: Task; projectTitle: string; isAssigned: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { type: 'task' as const, id: task.id },
  })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-[6px] border border-[#E8E4DD] bg-white
        transition-all duration-150 select-none
        ${isDragging ? 'opacity-0 pointer-events-none' : ''}
        ${isAssigned && !isDragging ? 'opacity-30' : ''}
        ${!isAssigned && !isDragging ? 'cursor-grab hover:border-[#2A2724]/20 hover:shadow-sm active:cursor-grabbing' : ''}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#2A2724]/30 flex-shrink-0" />
      <span className="text-[13px] text-[#2A2724] flex-1 min-w-0 truncate">{task.title}</span>
      {projectTitle !== 'Standalone' && (
        <span className="text-[10px] text-[#7A746A]/50 flex-shrink-0 max-w-[80px] truncate">{projectTitle}</span>
      )}
    </div>
  )
}

// ─── Draggable Meeting Row ──────────────────────────────────────
function DraggableMeetingRow({ meeting, isAssigned }: { meeting: Meeting; isAssigned: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `meeting-${meeting.id}`,
    data: { type: 'meeting' as const, id: meeting.id },
  })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-[6px] border border-[#E8E4DD] bg-white
        transition-all duration-150 select-none
        ${isDragging ? 'opacity-0 pointer-events-none' : ''}
        ${isAssigned && !isDragging ? 'opacity-30' : ''}
        ${!isAssigned && !isDragging ? 'cursor-grab hover:border-[#2A2724]/20 hover:shadow-sm active:cursor-grabbing' : ''}`}
    >
      <Clock size={13} className="text-[#7A746A] flex-shrink-0" />
      <span className="text-[11px] text-[#7A746A]/60 font-mono flex-shrink-0 w-10">{meeting.time}</span>
      <span className="text-[13px] text-[#2A2724] flex-1 truncate">{meeting.title}</span>
      <span className="text-[10px] text-[#7A746A]/50 flex-shrink-0">{meeting.durationMinutes}m</span>
    </div>
  )
}

// ─── Collapsible Section ────────────────────────────────────────
function Section({ title, count, defaultOpen = true, action, children }: { title: string; count: number; defaultOpen?: boolean; action?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 flex-1 text-left"
        >
          {open ? <ChevronDown size={12} className="text-[#7A746A]/50" /> : <ChevronRight size={12} className="text-[#7A746A]/50" />}
          <span className="text-[11px] uppercase tracking-wider text-[#7A746A]/60 flex-1">{title}</span>
          <span className="text-[10px] text-[#7A746A]/40">{count}</span>
        </button>
        {action && <div className="ml-1">{action}</div>}
      </div>
      {open && children}
    </div>
  )
}

// ─── Main Inventory Panel ───────────────────────────────────────
export function InventoryPanel({ allAssignedIds, day = 'today' }: InventoryPanelProps) {
  const projects = useStore(s => s.projects)
  const orphanTasks = useStore(s => s.orphanTasks)
  const meetings = useStore(s => s.meetings)
  const recurringMeetings = useStore(s => s.recurringMeetings)
  const setOpenMeetingId = useStore(s => s.setOpenMeetingId)
  const [search, setSearch] = useState('')

  const planDate = day === 'tomorrow' ? getTomorrowString() : getTodayString()
  const planDateObj = new Date(planDate + 'T00:00:00')

  const inProgressProjects = useMemo(() => projects.filter(p => p.status === 'in_progress'), [projects])
  const availableTasks = useMemo(() => getAvailableTasks(projects, orphanTasks, []), [projects, orphanTasks])

  // Meetings scheduled for the plan day (including undated meetings treated as today)
  const allMeetingsList = useMemo(() => {
    const dated = meetings.filter(m => m.date === planDate || !m.date)
    const recurring = recurringMeetings.filter(m => m.recurrenceRule && isDueToday(m.recurrenceRule, planDateObj))
    return [...dated, ...recurring].sort((a, b) => a.time.localeCompare(b.time))
  }, [meetings, recurringMeetings, planDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const q = search.toLowerCase().trim()
  const filteredProjects = useMemo(() => q ? inProgressProjects.filter(p => p.title.toLowerCase().includes(q)) : inProgressProjects, [q, inProgressProjects])
  const filteredTasks = useMemo(() => q ? availableTasks.filter(t => t.task.title.toLowerCase().includes(q)) : availableTasks, [q, availableTasks])
  const filteredMeetings = useMemo(() => q ? allMeetingsList.filter(m => m.title.toLowerCase().includes(q)) : allMeetingsList, [q, allMeetingsList])

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="relative mb-4">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A746A]/40" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full pl-8 pr-3 py-2 rounded-[8px] border border-[#E8E4DD] bg-white
            text-[12px] text-[#2A2724] placeholder:text-[#7A746A]/40
            outline-none focus:border-[#2A2724]/30 transition-colors"
        />
      </div>

      {/* Scrollable inventory */}
      <div className="flex-1 overflow-y-auto space-y-5 min-h-0">
        {/* Projects */}
        {filteredProjects.length > 0 && (
          <Section title="Projects" count={filteredProjects.length}>
            <div className="space-y-2">
              {filteredProjects.map(project => (
                <DraggableProjectCard
                  key={project.id}
                  project={project}
                  isAssigned={allAssignedIds.has(project.id)}
                />
              ))}
            </div>
          </Section>
        )}

        {/* Tasks */}
        {filteredTasks.length > 0 && (
          <Section title="Tasks" count={filteredTasks.length}>
            <div className="space-y-1.5">
              {filteredTasks.map(({ task, projectTitle }) => (
                <DraggableTaskRow
                  key={task.id}
                  task={task}
                  projectTitle={projectTitle}
                  isAssigned={allAssignedIds.has(task.id)}
                />
              ))}
            </div>
          </Section>
        )}

        {/* Meetings — only today's/tomorrow's */}
        <Section
          title="Meetings"
          count={filteredMeetings.length}
          action={
            <button
              onClick={() => setOpenMeetingId('new')}
              className="flex items-center gap-0.5 text-[10px] text-[#7A746A]/50 hover:text-[#2A2724] transition-colors"
            >
              <Plus size={10} />
              New
            </button>
          }
        >
          <div className="space-y-1.5">
            {filteredMeetings.length === 0 ? (
              <p className="text-[11px] text-[#7A746A]/35 italic py-0.5">
                No meetings {day === 'tomorrow' ? 'tomorrow' : 'today'}
              </p>
            ) : (
              filteredMeetings.map(meeting => (
                <DraggableMeetingRow
                  key={meeting.id}
                  meeting={meeting}
                  isAssigned={allAssignedIds.has(meeting.id)}
                />
              ))
            )}
          </div>
        </Section>

        {filteredProjects.length === 0 && filteredTasks.length === 0 && filteredMeetings.length === 0 && (
          <div className="text-[13px] text-[#7A746A]/40 text-center py-8 italic">
            {q ? 'No items match your search' : 'No items available'}
          </div>
        )}
      </div>
    </div>
  )
}
