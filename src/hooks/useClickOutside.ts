import { useEffect, type RefObject } from 'react'

/**
 * Calls `callback` whenever a mousedown event occurs outside of `ref`.
 * Attach this to any element that should close on outside click.
 * Pass `enabled: false` to disable the listener (e.g. when the popup is hidden).
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  callback: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        callback()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [enabled, ref, callback])
}
