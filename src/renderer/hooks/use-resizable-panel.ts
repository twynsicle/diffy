import { useCallback, useRef, useState } from 'react'

type UseResizablePanelOptions = {
  defaultWidth: number
  minWidth: number
  maxWidth: number
  edge: 'left' | 'right'
}

type UseResizablePanelResult = {
  width: number
  handleMouseDown: (e: React.MouseEvent) => void
}

export function useResizablePanel({
  defaultWidth,
  minWidth,
  maxWidth,
  edge,
}: UseResizablePanelOptions): UseResizablePanelResult {
  const [width, setWidth] = useState(defaultWidth)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragging.current = true
      startX.current = e.clientX
      startWidth.current = width

      const handleMouseMove = (ev: MouseEvent): void => {
        if (!dragging.current) return
        // Dragging left edge: moving mouse left = wider pane
        // Dragging right edge: moving mouse right = wider pane
        const delta = edge === 'left'
          ? startX.current - ev.clientX
          : ev.clientX - startX.current
        const next = Math.min(maxWidth, Math.max(minWidth, startWidth.current + delta))
        setWidth(next)
      }

      const handleMouseUp = (): void => {
        dragging.current = false
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
    [width, minWidth, maxWidth, edge],
  )

  return { width, handleMouseDown }
}
