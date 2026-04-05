// src/components/vandaag/CitadelTaskPanel.tsx
import { useMemo, useState, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus } from 'lucide-react'
import { useStore } from '../../store'
import { useTaskToggle } from '../../hooks/useTaskToggle'
import type { Project, Task } from '../../types'

function CitadelTaskRow({ task, onToggle }: { task: Task; onToggle: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isDone = task.status === 'done'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 py-2.5 px-4 rounded-[8px] transition-all
        ${isDragging ? 'opacity-40' : ''}
        ${!isDragging ? 'hover:bg-citadel-text/5' : ''}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-citadel-text/15 hover:text-citadel-text/40 cursor-grab active:cursor-grabbing flex-shrink-0"
        tabIndex={-1}
      >
        <GripVertical size={13} />
      </button>

      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-all
          ${isDone
            ? 'bg-citadel-accent/50 border-citadel-accent/50'
            : 'border-citadel-text/20 hover:border-citadel-text/40'}`}
      >
        {isDone && (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path d="M1 3L3 5L7 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-citadel-bg" />
          </svg>
        )}
      </button>

      {/* Title */}
      <span className={`text-[13px] flex-1 min-w-0 leading-snug transition-all
        ${isDone ? 'line-through text-citadel-text/25' : 'text-citadel-text/70'}`}>
        {task.title}
      </span>
    </div>
  )
}

function CitadelDoneTaskRow({ task, onToggle }: { task: Task; onToggle: (id: string) => void }) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-4 rounded-[8px] hover:bg-citadel-text/5 transition-all">
      {/* Spacer to align with sortable rows that have a drag handle */}
      <div className="w-[13px] flex-shrink-0" />

      <button
        onClick={() => onToggle(task.id)}
        className="w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-all bg-citadel-accent/50 border-citadel-accent/50"
      >
        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
          <path d="M1 3L3 5L7 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-citadel-bg" />
        </svg>
      </button>

      <span className="text-[13px] flex-1 min-w-0 leading-snug line-through text-citadel-text/25">
        {task.title}
      </span>
    </div>
  )
}

export function CitadelTaskPanel({ project }: { project: Project }) {
  const reorderProjectTasks = useStore(s => s.reorderProjectTasks)
  const addTask = useStore(s => s.addTask)
  const toggleTask = useTaskToggle()
  const [newTitle, setNewTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    addTask(title, project.id)
    setNewTitle('')
    inputRef.current?.focus()
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const activeTasks = useMemo(() => project.tasks.filter(t => t.status !== 'done'), [project.tasks])
  const doneTasks = useMemo(() => project.tasks.filter(t => t.status === 'done'), [project.tasks])
  const activeIds = useMemo(() => activeTasks.map(t => t.id), [activeTasks])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = activeIds.indexOf(active.id as string)
    const newIndex = activeIds.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(activeTasks, oldIndex, newIndex)
    reorderProjectTasks(project.id, [...reordered.map(t => t.id), ...doneTasks.map(t => t.id)])
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-5 border-b border-citadel-text/10">
        <p className="text-[10px] uppercase tracking-[0.1em] text-citadel-text/25 font-medium mb-1">
          Project tasks
        </p>
        <h3 className="text-[15px] font-serif text-citadel-text/60 leading-tight truncate">
          {project.title}
        </h3>
        {project.tasks.length > 0 && (
          <p className="text-[10px] text-citadel-text/25 mt-1">
            {doneTasks.length} / {project.tasks.length} done
          </p>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto py-2">
        {project.tasks.length === 0 ? (
          <p className="text-[12px] text-citadel-text/20 italic px-5 py-4">
            No tasks yet
          </p>
        ) : (
          <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={activeIds} strategy={verticalListSortingStrategy}>
                {activeTasks.map(task => (
                  <CitadelTaskRow key={task.id} task={task} onToggle={toggleTask} />
                ))}
              </SortableContext>
            </DndContext>

            {/* Done tasks — shown below, not sortable */}
            {doneTasks.length > 0 && (
              <div className="mt-1">
                {doneTasks.map(task => (
                  <CitadelDoneTaskRow key={task.id} task={task} onToggle={toggleTask} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add task */}
      <form
        onSubmit={handleAddTask}
        className="px-4 py-3 border-t border-citadel-text/10 flex items-center gap-2"
      >
        <button
          type="submit"
          className="w-5 h-5 rounded-full border border-citadel-text/20 flex items-center justify-center
            text-citadel-text/25 hover:text-citadel-text/50 hover:border-citadel-text/40
            flex-shrink-0 transition-all"
        >
          <Plus size={10} />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="Add a task..."
          className="flex-1 bg-transparent text-[13px] text-citadel-text/60 placeholder:text-citadel-text/20
            outline-none border-none leading-snug"
        />
      </form>
    </div>
  )
}
