import { useState, useCallback, useEffect, useMemo } from 'react'
import { useStore } from '../../store'
import { ProjectEditor } from '../editor/ProjectEditor'
import { CATEGORY_CONFIG, type Project } from '../../types'

import { ProjectModalCover } from './ProjectModalCover'
import { ProjectModalTasks } from './ProjectModalTasks'
import { ProjectModalWaiting } from './ProjectModalWaiting'
import { ProjectModalRecurring } from './ProjectModalRecurring'
import { ProjectModalMeetings } from './ProjectModalMeetings'
import { ProjectModalSettings } from './ProjectModalSettings'

type ModalTab = 'tasks' | 'notes' | 'meetings'

interface ProjectModalProps {
  project: Project | null
  onClose: () => void
}

export function ProjectModal({ project, onClose }: ProjectModalProps) {
  const updateProject = useStore(s => s.updateProject)
  const syncCheckboxTasks = useStore(s => s.syncCheckboxTasks)
  const meetings = useStore(s => s.meetings)
  const projectModalDefaultTab = useStore(s => s.projectModalDefaultTab)
  const clearProjectModalDefaultTab = useStore(s => s.clearProjectModalDefaultTab)

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [showEditor, setShowEditor] = useState(false)
  const [activeTab, setActiveTab] = useState<ModalTab>(
    (projectModalDefaultTab as ModalTab) ?? 'tasks'
  )
  const [showSettings, setShowSettings] = useState(false)

  // Clear the default tab signal once on mount
  useEffect(() => {
    if (projectModalDefaultTab) clearProjectModalDefaultTab()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset tab + settings when project changes
  useEffect(() => {
    setActiveTab('tasks')
    setShowSettings(false)
  }, [project?.id])

  // Delay showing editor to avoid flash
  useEffect(() => {
    if (project) {
      const timer = setTimeout(() => setShowEditor(true), 100)
      return () => clearTimeout(timer)
    } else {
      setShowEditor(false)
    }
  }, [project?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleEditorChange = useCallback((content: string) => {
    if (project) {
      updateProject(project.id, { bodyContent: content })
    }
  }, [project?.id, updateProject]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCheckboxChange = useCallback((checkboxTexts: string[]) => {
    if (project) {
      syncCheckboxTasks(project.id, checkboxTexts)
    }
  }, [project?.id, syncCheckboxTasks]) // eslint-disable-line react-hooks/exhaustive-deps

  const meetingCount = useMemo(() => {
    if (!project) return 0
    return meetings.filter(m => m.projectId === project.id).length
  }, [meetings, project?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!project) return null

  const categoryConfig = CATEGORY_CONFIG[project.category]

  function handleTitleSubmit() {
    if (titleDraft.trim()) {
      updateProject(project!.id, { title: titleDraft.trim() })
    }
    setEditingTitle(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" />
      <div
        className="relative bg-card w-full rounded-t-[16px] sm:rounded-[10px] sm:max-w-4xl max-h-[95vh] flex flex-col animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Fixed header (flex-shrink-0) ─────────────────────────── */}
        <div className="flex-shrink-0">
          <ProjectModalCover
            project={project}
            categoryConfig={categoryConfig}
            onClose={onClose}
            updateProject={updateProject}
            onGearClick={() => setShowSettings(s => !s)}
            gearOpen={showSettings}
            categoryLabel={CATEGORY_CONFIG[project.category].label}
            categoryColor={categoryConfig.color}
            categoryBg={categoryConfig.bg}
          />

          <div className="px-7 pt-5">
            {/* Title */}
            {editingTitle ? (
              <input
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={e => e.key === 'Enter' && handleTitleSubmit()}
                autoFocus
                className="text-[22px] font-serif text-charcoal bg-transparent border-none outline-none w-full mb-1 tracking-[-0.01em]"
              />
            ) : (
              <h2
                className="text-[22px] font-serif text-charcoal mb-1 cursor-pointer hover:opacity-70 transition-opacity tracking-[-0.01em]"
                onClick={() => {
                  setTitleDraft(project.title)
                  setEditingTitle(true)
                }}
              >
                {project.title}
              </h2>
            )}

            {/* Meta row */}
            {project.trackProgress && project.daysWorked > 0 && (
              <div className="flex items-center gap-3 mb-0">
                <span className="text-[11px] text-stone font-medium" style={{ color: categoryConfig.color }}>
                  {project.daysWorked} days worked
                </span>
              </div>
            )}

            {/* Tab bar */}
            <div className="flex gap-6 mt-4 border-b border-border -mx-7 px-7">
              {(['tasks', 'notes', 'meetings'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-2.5 text-[13px] capitalize transition-all border-b-2 -mb-px
                    ${activeTab === tab
                      ? 'font-medium text-charcoal'
                      : 'text-stone border-transparent hover:text-charcoal/70'}`}
                  style={activeTab === tab ? { borderBottomColor: categoryConfig.color } : undefined}
                >
                  {tab}
                  {tab === 'meetings' && meetingCount > 0 && (
                    <span className="ml-1.5 text-[10px] bg-[#F0EEEB] rounded-full px-1.5 py-0.5">
                      {meetingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Settings panel (between header and content) ──────────── */}
        {showSettings && (
          <ProjectModalSettings project={project} onClose={onClose} />
        )}

        {/* ── Tab content (scrollable) ─────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-7 py-6">
          {activeTab === 'tasks' && (
            <>
              <ProjectModalWaiting project={project} updateProject={updateProject} />
              <ProjectModalTasks project={project} />
              <ProjectModalRecurring project={project} />
            </>
          )}

          {activeTab === 'notes' && (
            <div className="min-h-[400px] -mx-3">
              {showEditor && (
                <ProjectEditor
                  key={project.id}
                  initialContent={project.bodyContent}
                  onChange={handleEditorChange}
                  onCheckboxChange={handleCheckboxChange}
                />
              )}
            </div>
          )}

          {activeTab === 'meetings' && (
            <ProjectModalMeetings projectId={project.id} />
          )}
        </div>
      </div>
    </div>
  )
}
