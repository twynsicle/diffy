import { type ReactElement, useCallback, useMemo, useState } from 'react'

import { SUMMARY_SECTION_ID } from '@shared/types'

import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useAppSelector } from '../hooks/use-app-selector'
import { useResizablePanel } from '../hooks/use-resizable-panel'
import {
  refreshNarrativeFiles,
  selectActiveChapterId,
  selectChapterList,
  selectNarrativeFileList,
  selectRefreshingFiles,
  selectSelectedNarrativeFile,
  setActiveChapter,
  setSelectedFile,
} from '../store/narrative-slice'
import { prFileToFileChange } from '../utils/status-adapter'

import styles from './ChapterNav.module.css'
import { FileTree } from './FileTree'

export function ChapterNav(): ReactElement {
  const dispatch = useAppDispatch()
  const chapters = useAppSelector(selectChapterList)
  const activeId = useAppSelector(selectActiveChapterId)
  const files = useAppSelector(selectNarrativeFileList)
  const selectedFile = useAppSelector(selectSelectedNarrativeFile)
  const refreshing = useAppSelector(selectRefreshingFiles)
  const { width, handleMouseDown } = useResizablePanel({ defaultWidth: 300, minWidth: 180, maxWidth: 600, edge: 'left', storageKey: 'diffy:navPanelWidth' })

  const handleClick = useCallback(
    (id: string) => {
      dispatch(setActiveChapter(id))
    },
    [dispatch],
  )

  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(() => new Set())

  const fileChanges = useMemo(() => files.map(prFileToFileChange), [files])

  const handleToggleFolder = useCallback((folderPath: string) => {
    setCollapsedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(folderPath)) {
        next.delete(folderPath)
      } else {
        next.add(folderPath)
      }
      return next
    })
  }, [])

  const handleSelectFile = useCallback(
    (path: string) => {
      dispatch(setSelectedFile(path))
    },
    [dispatch],
  )

  const handleRefreshFiles = useCallback(() => {
    void dispatch(refreshNarrativeFiles())
  }, [dispatch])

  return (
    <nav className={styles.nav} style={{ width }} aria-label="Chapter navigation">
      <div className={styles.resizeHandle} onMouseDown={handleMouseDown} />
      <div className={styles.scrollArea}>
        <div className={styles.heading}>Chapters</div>
        <div className={styles.list}>
          {chapters.map((ch, i) => (
            <button
              key={ch.id}
              className={`${styles.item} ${ch.id === activeId ? styles.active : ''}`}
              onClick={() => { handleClick(ch.id) }}
              type="button"
              aria-current={ch.id === activeId ? 'true' : undefined}
            >
              <span className={styles.number}>{i + 1}</span>
              <span className={styles.label}>{ch.title}</span>
            </button>
          ))}
          <div className={styles.divider} />
          <button
            className={`${styles.item} ${activeId === SUMMARY_SECTION_ID ? styles.active : ''}`}
            onClick={() => { handleClick(SUMMARY_SECTION_ID) }}
            type="button"
            aria-current={activeId === SUMMARY_SECTION_ID ? 'true' : undefined}
          >
            <span className={styles.label}>Summary</span>
          </button>
          {files.length > 0 && (
            <>
              <div className={styles.divider} />
              <div className={styles.headingRow}>
                <span className={styles.headingLabel}>Files</span>
                <button
                  className={styles.refreshBtn}
                  onClick={handleRefreshFiles}
                  disabled={refreshing}
                  type="button"
                  title="Refresh file list"
                  aria-label="Refresh file list"
                >
                  <svg
                    className={refreshing ? styles.refreshSpin : undefined}
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 8A6 6 0 1 1 10 2.5" />
                    <polyline points="10 1 14 2.5 12.5 6" />
                  </svg>
                </button>
              </div>
              <FileTree
                files={fileChanges}
                selectedPath={selectedFile ?? undefined}
                onSelect={handleSelectFile}
                emptyMessage="No files"
                collapsedPaths={collapsedPaths}
                onToggleFolder={handleToggleFolder}
                virtualize={false}
                variant="compact"
              />
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
