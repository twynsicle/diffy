import type { ReactElement } from 'react'
import { useCallback, useRef, useState } from 'react'

import type { FileChange, Section } from '@shared/types'

import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useAppSelector } from '../hooks/use-app-selector'
import {
  refreshStatus,
  selectFile,
  selectSelected,
  selectStaged,
  selectUnstaged,
  stageAll,
  stageFile,
  unstageAll,
  unstageFile,
} from '../store/changes-slice'
import { showConfirmModal } from '../store/ui-slice'

import { ContextMenu } from './ContextMenu'
import type { ContextMenuItem } from './ContextMenu'
import { FileList } from './FileList'
import { SectionHeader } from './SectionHeader'
import styles from './SidePane.module.css'

const DEFAULT_WIDTH = 300
const MIN_WIDTH = 180
const MAX_WIDTH = 600

export function SidePane(): ReactElement {
  const dispatch = useAppDispatch()
  const staged = useAppSelector(selectStaged)
  const unstaged = useAppSelector(selectUnstaged)
  const selected = useAppSelector(selectSelected)

  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [contextMenu, setContextMenu] = useState<{
    file: FileChange
    x: number
    y: number
  } | null>(null)
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
        const delta = startX.current - ev.clientX
        const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta))
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
    [width],
  )

  const handleSelect = useCallback(
    (path: string, section: Section, origPath?: string) => {
      dispatch(selectFile({ path, section, origPath }))
    },
    [dispatch],
  )

  const handleStageFile = useCallback(
    (path: string) => {
      void dispatch(stageFile(path)).then(() => dispatch(refreshStatus()))
    },
    [dispatch],
  )

  const handleUnstageFile = useCallback(
    (path: string) => {
      void dispatch(unstageFile(path)).then(() => dispatch(refreshStatus()))
    },
    [dispatch],
  )

  const handleStageAll = useCallback(() => {
    void dispatch(stageAll()).then(() => dispatch(refreshStatus()))
  }, [dispatch])

  const handleUnstageAll = useCallback(() => {
    void dispatch(unstageAll()).then(() => dispatch(refreshStatus()))
  }, [dispatch])

  const handleContextMenu = useCallback(
    (file: FileChange, x: number, y: number) => {
      setContextMenu({ file, x, y })
    },
    [],
  )

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const contextMenuItems: ContextMenuItem[] = contextMenu
    ? [
        {
          label: 'Discard Changes',
          shortcutHint: '\u232B',
          disabled: contextMenu.file.section !== 'unstaged',
          onSelect: () => {
            const file = contextMenu.file
            const msg = file.isUntracked
              ? `Delete untracked file "${file.displayPath}"? This cannot be undone.`
              : `Discard changes to "${file.displayPath}"? This will restore the file to its index state.`
            dispatch(
              showConfirmModal({
                title: 'Discard Changes',
                message: msg,
                onConfirmAction: { type: 'discard', path: file.path },
              }),
            )
          },
        },
        {
          label: 'Delete File',
          onSelect: () => {
            const file = contextMenu.file
            dispatch(
              showConfirmModal({
                title: 'Delete File',
                message: `Permanently delete "${file.displayPath}"? This cannot be undone.`,
                onConfirmAction: { type: 'delete', path: file.path },
              }),
            )
          },
        },
      ]
    : []

  return (
    <div className={styles.pane} style={{ width }}>
      <div className={styles.resizeHandle} onMouseDown={handleMouseDown} />
      <div className={styles.section}>
        <SectionHeader
          label="Unstaged"
          count={unstaged.length}
          actionLabel="Stage All"
          onAction={handleStageAll}
        />
        <FileList
          files={unstaged}
          selectedPath={selected?.section === 'unstaged' ? selected.path : undefined}
          onSelect={handleSelect}
          onAction={handleStageFile}
          actionLabel="Stage"
          emptyMessage="No unstaged changes"
          onContextMenu={handleContextMenu}
        />
      </div>
      <div className={styles.section}>
        <SectionHeader
          label="Staged"
          count={staged.length}
          actionLabel="Unstage All"
          onAction={handleUnstageAll}
        />
        <FileList
          files={staged}
          selectedPath={selected?.section === 'staged' ? selected.path : undefined}
          onSelect={handleSelect}
          onAction={handleUnstageFile}
          actionLabel="Unstage"
          emptyMessage="No staged changes"
          onContextMenu={handleContextMenu}
        />
      </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={closeContextMenu}
        />
      )}
    </div>
  )
}
