import { type ReactElement, useCallback } from 'react'

import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useAppSelector } from '../hooks/use-app-selector'
import {
  selectActiveChapterIndex,
  selectChapterList,
  selectPrData,
  setActiveChapter,
} from '../store/narrative-slice'

import styles from './NarrativeToolbar.module.css'

type NarrativeToolbarProps = {
  onRegenerate: () => void
}

export function NarrativeToolbar({ onRegenerate }: NarrativeToolbarProps): ReactElement {
  const dispatch = useAppDispatch()
  const prData = useAppSelector(selectPrData)
  const chapters = useAppSelector(selectChapterList)
  const activeIndex = useAppSelector(selectActiveChapterIndex)

  const goTo = useCallback(
    (index: number) => {
      const id = chapters[index].id
      dispatch(setActiveChapter(id))
      document.getElementById(`chapter-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    [dispatch, chapters],
  )

  const handlePrev = useCallback(() => {
    if (activeIndex > 0) goTo(activeIndex - 1)
  }, [activeIndex, goTo])

  const handleNext = useCallback(() => {
    if (activeIndex < chapters.length - 1) goTo(activeIndex + 1)
  }, [activeIndex, chapters.length, goTo])

  return (
    <div className={styles.toolbar}>
      <div className={styles.left}>
        {prData && (
          <span className={styles.prTitle} title={prData.title}>
            {prData.title}
          </span>
        )}
      </div>
      <div className={styles.center}>
        <button
          className={styles.navBtn}
          onClick={handlePrev}
          disabled={activeIndex <= 0}
          type="button"
          title="Previous chapter"
        >
          &#9664;
        </button>
        <span className={styles.counter}>
          {chapters.length > 0
            ? `${String(activeIndex + 1)} of ${String(chapters.length)}`
            : '0 of 0'}
        </span>
        <button
          className={styles.navBtn}
          onClick={handleNext}
          disabled={activeIndex >= chapters.length - 1}
          type="button"
          title="Next chapter"
        >
          &#9654;
        </button>
      </div>
      <div className={styles.right}>
        <button
          className={styles.regenerateBtn}
          onClick={onRegenerate}
          type="button"
        >
          Regenerate
        </button>
      </div>
    </div>
  )
}
