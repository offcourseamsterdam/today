import { useEffect, useMemo, useRef } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import type { Block } from '@blocknote/core'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'

interface ProjectEditorProps {
  initialContent: string
  onChange: (content: string) => void
  onCheckboxChange?: (checkboxTexts: string[]) => void
}

export function ProjectEditor({ initialContent, onChange, onCheckboxChange }: ProjectEditorProps) {
  const parsedContent = useMemo(() => {
    if (!initialContent) return undefined
    try {
      return JSON.parse(initialContent) as Block[]
    } catch {
      return undefined
    }
  }, []) // Only parse on mount — don't re-parse on every change // eslint-disable-line react-hooks/exhaustive-deps

  const editor = useCreateBlockNote({
    initialContent: parsedContent,
  })

  const checkboxSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!editor) return

    const unsubscribe = editor.onChange(() => {
      const blocks = editor.document
      const json = JSON.stringify(blocks)
      onChange(json)

      // Debounce checkbox sync — only fire after 500ms of inactivity
      if (onCheckboxChange) {
        if (checkboxSyncTimer.current) clearTimeout(checkboxSyncTimer.current)
        checkboxSyncTimer.current = setTimeout(() => {
          const checkboxTexts = extractCheckboxTexts(editor.document)
          onCheckboxChange(checkboxTexts)
        }, 500)
      }
    })

    return () => {
      unsubscribe()
      if (checkboxSyncTimer.current) clearTimeout(checkboxSyncTimer.current)
    }
  }, [editor, onChange, onCheckboxChange])

  return (
    <div className="vandaag-editor">
      <BlockNoteView
        editor={editor}
        theme="light"
      />
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractCheckboxTexts(blocks: Block[]): string[] {
  const texts: string[] = []

  function traverse(block: Block) {
    if (block.type === 'checkListItem' && block.content) {
      // BlockNote inline content can be text or link types
      // We extract text from all inline content items
      const contentArray = block.content as Array<Record<string, unknown>>
      const textParts: string[] = []
      for (const item of contentArray) {
        if (item.type === 'text' && typeof item.text === 'string') {
          textParts.push(item.text)
        }
      }
      const fullText = textParts.join('')
      if (fullText.trim()) {
        texts.push(fullText.trim())
      }
    }
    if (block.children) {
      block.children.forEach(traverse)
    }
  }

  blocks.forEach(traverse)
  return texts
}
