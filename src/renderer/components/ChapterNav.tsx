import { type ReactElement, useCallback } from 'react'

import { SUMMARY_SECTION_ID } from '@shared/types'

import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useAppSelector } from '../hooks/use-app-selector'
import { useResizablePanel } from '../hooks/use-resizable-panel'
import {
  selectActiveChapterId,
  selectChapterList,
  setActiveChapter,
} from '../store/narrative-slice'

import styles from './ChapterNav.module.css'

export function ChapterNav(): ReactElement {
  const dispatch = useAppDispatch()
  const chapters = useAppSelector(selectChapterList)
  const activeId = useAppSelector(selectActiveChapterId)
  const { width, handleMouseDown } = useResizablePanel({ defaultWidth: 250, minWidth: 160, maxWidth: 450, edge: 'left' })

  const handleClick = useCallback(
    (id: string) => {
      dispatch(setActiveChapter(id))
    },
    [dispatch],
  )

  return (
    <nav className={styles.nav} style={{ width }} aria-label="Chapter navigation">
      <div className={styles.resizeHandle} onMouseDown={handleMouseDown} />
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
      </div>
    </nav>
  )
}
