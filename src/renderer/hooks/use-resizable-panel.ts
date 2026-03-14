import { useCallback, useRef, useState } from 'react'

type UseResizablePanelOptions = {
  defaultWidth: number
  minWidth: number
  maxWidth: number
  edge: 'left' | 'right'
  /** When set, persist width to localStorage under this key (shared across components). */
  storageKey?: string
}

type UseResizablePanelResult = {
  width: number
  handleMouseDown: (e: React.MouseEvent) => void
}

function readStoredWidth(key: string, min: number, max: number, fallback: number): number {
  try {
    const raw = localStorage.getItem(key)
    if (raw !== null) {
      const parsed = Number(raw)
      if (!Number.isNaN(parsed)) {
        return Math.min(max, Math.max(min, parsed))
      }
    }
  } catch {
    // localStorage may be unavailable
  }
  return fallback
}

function writeStoredWidth(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // Best-effort persistence
  }
}

export function useResizablePanel({
  defaultWidth,
  minWidth,
  maxWidth,
  edge,
  storageKey,
}: UseResizablePanelOptions): UseResizablePanelResult {
  const [width, setWidth] = useState(() =>
    storageKey ? readStoredWidth(storageKey, minWidth, maxWidth, defaultWidth) : defaultWidth,
  )
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)
  const latestWidth = useRef(width)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragging.current = true
      startX.current = e.clientX
      startWidth.current = width

      const handleMouseMove = (ev: MouseEvent): void => {
        if (!dragging.current) return
        const delta = edge === 'left' ? startX.current - ev.clientX : ev.clientX - startX.current
        const next = Math.min(maxWidth, Math.max(minWidth, startWidth.current + delta))
        latestWidth.current = next
        setWidth(next)
      }

      const handleMouseUp = (): void => {
        dragging.current = false
        if (storageKey) {
          writeStoredWidth(storageKey, latestWidth.current)
        }
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [width, minWidth, maxWidth, edge, storageKey],
  )

  return { width, handleMouseDown }
}
