import type { ReactElement } from 'react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import styles from './ContextMenu.module.css'

export type ContextMenuItem = {
  label: string
  shortcutHint?: string
  disabled?: boolean
  onSelect: () => void
}

type ContextMenuProps = {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps): ReactElement {
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x, y })
  const [focusedIndex, setFocusedIndex] = useState(-1)

  useLayoutEffect(() => {
    const el = menuRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const clampedX = Math.min(x, window.innerWidth - rect.width - 4)
    const clampedY = Math.min(y, window.innerHeight - rect.height - 4)
    setPos({ x: Math.max(0, clampedX), y: Math.max(0, clampedY) })
  }, [x, y])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((prev) => {
          let next = prev + 1
          while (next < items.length && items[next].disabled) next++
          return next < items.length ? next : prev
        })
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((prev) => {
          let next = prev - 1
          while (next >= 0 && items[next].disabled) next--
          return next >= 0 ? next : prev
        })
        return
      }
      if (e.key === 'Enter' && focusedIndex >= 0 && !items[focusedIndex].disabled) {
        items[focusedIndex].onSelect()
        onClose()
      }
    },
    [items, focusedIndex, onClose],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  useEffect(() => {
    const handleClick = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleScroll = (): void => {
      onClose()
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('scroll', handleScroll, true)
    }
  }, [onClose])

  useEffect(() => {
    if (focusedIndex >= 0) {
      const buttons = menuRef.current?.querySelectorAll('button')
      const btn = buttons?.[focusedIndex]
      if (btn instanceof HTMLElement) btn.focus()
    }
  }, [focusedIndex])

  return createPortal(
    <div className={styles['menu']} ref={menuRef} style={{ left: pos.x, top: pos.y }} role="menu">
      {items.map((item, i) => (
        <button
          key={item.label}
          className={styles['item']}
          role="menuitem"
          disabled={item.disabled}
          tabIndex={focusedIndex === i ? 0 : -1}
          onClick={() => {
            if (!item.disabled) {
              item.onSelect()
              onClose()
            }
          }}
          type="button"
        >
          <span>{item.label}</span>
          {item.shortcutHint && <span className={styles['shortcutHint']}>{item.shortcutHint}</span>}
        </button>
      ))}
    </div>,
    document.body,
  )
}
