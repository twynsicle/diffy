import { type ReactElement, useCallback } from 'react'

import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useAppSelector } from '../hooks/use-app-selector'
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

  const handleClick = useCallback(
    (id: string) => {
      dispatch(setActiveChapter(id))
      document.getElementById(`chapter-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    [dispatch],
  )

  return (
    <nav className={styles.nav} aria-label="Chapter navigation">
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
      </div>
    </nav>
  )
}
