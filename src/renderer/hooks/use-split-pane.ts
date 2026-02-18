import { useCallback, useRef, useState } from 'react'

type UseSplitPaneOptions = {
  defaultRatio: number
  minRatio: number
  maxRatio: number
}

type UseSplitPaneResult = {
  topRatio: number
  handleMouseDown: (e: React.MouseEvent) => void
}

export function useSplitPane({
  defaultRatio,
  minRatio,
  maxRatio,
}: UseSplitPaneOptions): UseSplitPaneResult {
  const [topRatio, setTopRatio] = useState(defaultRatio)
  const dragging = useRef(false)
  const startY = useRef(0)
  const startRatio = useRef(0)
  const containerHeight = useRef(0)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()

      const container = (e.target as HTMLElement).closest('[data-split-container]')
      if (!container) return

      dragging.current = true
      startY.current = e.clientY
      startRatio.current = topRatio
      containerHeight.current = container.getBoundingClientRect().height

      const handleMouseMove = (ev: MouseEvent): void => {
        if (!dragging.current || containerHeight.current === 0) return
        const deltaY = ev.clientY - startY.current
        const deltaRatio = deltaY / containerHeight.current
        const next = Math.min(maxRatio, Math.max(minRatio, startRatio.current + deltaRatio))
        setTopRatio(next)
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
      document.body.style.cursor = 'row-resize'
      document.body.style.userSelect = 'none'
    },
    [topRatio, minRatio, maxRatio],
  )

  return { topRatio, handleMouseDown }
}
