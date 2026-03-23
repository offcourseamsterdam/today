import { useRef } from 'react'
import { GripVertical, X, Repeat } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { v4 as uuid } from 'uuid'
import type { AgendaItem } from '../../types'

const DURATION_OPTIONS = [5, 10, 15, 20, 30, 45, 60]

interface AgendaItemRowProps {
  item: AgendaItem
  index: number
  total: number
  onChange: (id: string, patch: Partial<AgendaItem>) => void
  onDelete: (id: string) => void
  onEnter: (id: string) => void
  onBackspaceEmpty: (id: string) => void
  focusRef: React.MutableRefObject<Map<string, HTMLInputElement>>
}

function AgendaItemRow({
  item,
  onChange,
  onDelete,
  onEnter,
  onBackspaceEmpty,
  focusRef,
}: AgendaItemRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 group py-1"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-stone/20 hover:text-stone/50 transition-colors cursor-grab active:cursor-grabbing flex-shrink-0"
        tabIndex={-1}
      >
        <GripVertical size={12} />
      </button>

      {/* Title input */}
      <input
        ref={el => {
          if (el) focusRef.current.set(item.id, el)
          else focusRef.current.delete(item.id)
        }}
        type="text"
        value={item.title}
        onChange={e => onChange(item.id, { title: e.target.value })}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onEnter(item.id)
          } else if (e.key === 'Backspace' && item.title === '') {
            e.preventDefault()
            onBackspaceEmpty(item.id)
          }
        }}
        placeholder="Agenda item..."
        className="flex-1 min-w-0 bg-transparent text-[13px] text-charcoal
          placeholder:text-stone/25 outline-none border-b border-transparent
          focus:border-stone/20 transition-colors py-0.5"
      />

      {/* Duration chips */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => onChange(item.id, { durationMinutes: undefined })}
          className={`text-[10px] px-1.5 py-0.5 rounded transition-colors
            ${item.durationMinutes == null
              ? 'bg-charcoal text-canvas'
              : 'text-stone/40 hover:text-stone'}`}
        >
          —
        </button>
        {DURATION_OPTIONS.map(d => (
          <button
            key={d}
            type="button"
            onClick={() => onChange(item.id, { durationMinutes: d })}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors
              ${item.durationMinutes === d
                ? 'bg-charcoal text-canvas'
                : 'text-stone/40 hover:text-stone'}`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Recurring toggle */}
      <button
        type="button"
        onClick={() => onChange(item.id, { recurring: !item.recurring })}
        className={`flex-shrink-0 transition-colors
          ${item.recurring
            ? 'text-charcoal'
            : 'text-stone/20 hover:text-stone/50 opacity-0 group-hover:opacity-100'}`}
        tabIndex={-1}
        title={item.recurring ? 'Recurring — appears every meeting' : 'Make recurring'}
      >
        <Repeat size={11} />
      </button>

      {/* Delete */}
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="text-stone/20 hover:text-red-400 transition-colors flex-shrink-0
          opacity-0 group-hover:opacity-100"
        tabIndex={-1}
      >
        <X size={12} />
      </button>
    </div>
  )
}

interface AgendaItemEditorProps {
  items: AgendaItem[]
  onChange: (items: AgendaItem[]) => void
}

export function AgendaItemEditor({ items, onChange }: AgendaItemEditorProps) {
  const focusRef = useRef<Map<string, HTMLInputElement>>(new Map())
  const sensors = useSensors(useSensor(PointerSensor))

  function handleChange(id: string, patch: Partial<AgendaItem>) {
    onChange(items.map(it => it.id === id ? { ...it, ...patch } : it))
  }

  function handleDelete(id: string) {
    const idx = items.findIndex(it => it.id === id)
    const next = items.filter(it => it.id !== id)
    onChange(next)
    // Focus previous or next item
    const focusId = next[idx - 1]?.id ?? next[idx]?.id
    if (focusId) setTimeout(() => focusRef.current.get(focusId)?.focus(), 0)
  }

  function handleEnter(id: string) {
    const idx = items.findIndex(it => it.id === id)
    const newItem: AgendaItem = { id: uuid(), title: '' }
    const next = [...items.slice(0, idx + 1), newItem, ...items.slice(idx + 1)]
    onChange(next)
    setTimeout(() => focusRef.current.get(newItem.id)?.focus(), 0)
  }

  function handleBackspaceEmpty(id: string) {
    if (items.length <= 1) return
    handleDelete(id)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex(it => it.id === active.id)
    const newIndex = items.findIndex(it => it.id === over.id)
    onChange(arrayMove(items, oldIndex, newIndex))
  }

  function addItem() {
    const newItem: AgendaItem = { id: uuid(), title: '' }
    onChange([...items, newItem])
    setTimeout(() => focusRef.current.get(newItem.id)?.focus(), 0)
  }

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items.map(it => it.id)} strategy={verticalListSortingStrategy}>
          {items.map((item, i) => (
            <AgendaItemRow
              key={item.id}
              item={item}
              index={i}
              total={items.length}
              onChange={handleChange}
              onDelete={handleDelete}
              onEnter={handleEnter}
              onBackspaceEmpty={handleBackspaceEmpty}
              focusRef={focusRef}
            />
          ))}
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={addItem}
        className="mt-2 text-[11px] text-stone/40 hover:text-stone transition-colors"
      >
        + Add item
      </button>
    </div>
  )
}
