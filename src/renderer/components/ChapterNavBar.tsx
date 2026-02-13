import { type ReactElement, useCallback } from 'react'

import { SUMMARY_SECTION_ID } from '@shared/types'

import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useAppSelector } from '../hooks/use-app-selector'
import {
  selectActiveChapterId,
  selectActiveChapterIndex,
  selectChapterList,
  setActiveChapter,
} from '../store/narrative-slice'

import styles from './ChapterNavBar.module.css'

export function ChapterNavBar(): ReactElement {
  const dispatch = useAppDispatch()
  const chapters = useAppSelector(selectChapterList)
  const activeIndex = useAppSelector(selectActiveChapterIndex)
  const activeId = useAppSelector(selectActiveChapterId)

  const isSummary = activeId === SUMMARY_SECTION_ID
  // Total sections = chapters + summary
  const totalSections = chapters.length + 1
  // Summary is at index chapters.length
  const currentPosition = isSummary ? chapters.length : activeIndex

  const goTo = useCallback(
    (index: number) => {
      if (index === chapters.length) {
        dispatch(setActiveChapter(SUMMARY_SECTION_ID))
      } else {
        dispatch(setActiveChapter(chapters[index].id))
      }
    },
    [dispatch, chapters],
  )

  const handlePrev = useCallback(() => {
    if (currentPosition > 0) goTo(currentPosition - 1)
  }, [currentPosition, goTo])

  const handleNext = useCallback(() => {
    if (currentPosition < totalSections - 1) goTo(currentPosition + 1)
  }, [currentPosition, totalSections, goTo])

  const label = isSummary
    ? 'Summary'
    : chapters.length > 0
      ? `${String(activeIndex + 1)} of ${String(chapters.length)}`
      : '0 of 0'

  return (
    <div className={styles.bar}>
      <button
        className={styles.navBtn}
        onClick={handlePrev}
        disabled={currentPosition <= 0}
        type="button"
        title="Previous chapter"
      >
        &#9664; Previous
      </button>
      <span className={styles.counter}>{label}</span>
      <button
        className={styles.navBtn}
        onClick={handleNext}
        disabled={currentPosition >= totalSections - 1}
        type="button"
        title="Next chapter"
      >
        Next &#9654;
      </button>
    </div>
  )
}
