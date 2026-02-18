import { type ReactElement, useCallback } from 'react'

import { SUMMARY_SECTION_ID } from '@shared/types'

import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useAppSelector } from '../hooks/use-app-selector'
import { useNarrativeDiffLoader } from '../hooks/use-narrative-diff-loader'
import {
  selectActiveChapterId,
  selectChapterList,
  selectPrData,
  selectReview,
  selectSelectedNarrativeFile,
  setActiveChapter,
  setSelectedFile,
} from '../store/narrative-slice'

import { ChapterCard } from './ChapterCard'
import { DiffPanel } from './DiffPanel'
import { InsightCallout } from './InsightCallout'
import { MarkdownText } from './MarkdownText'
import { SummaryCard } from './SummaryCard'
import styles from './NarrativeView.module.css'

export function NarrativeView(): ReactElement | null {
  const dispatch = useAppDispatch()
  const review = useAppSelector(selectReview)
  const activeChapterId = useAppSelector(selectActiveChapterId)
  const prData = useAppSelector(selectPrData)
  const selectedFile = useAppSelector(selectSelectedNarrativeFile)
  const chapters = useAppSelector(selectChapterList)

  useNarrativeDiffLoader()

  const handleCloseFile = useCallback(() => {
    const firstChapterId = chapters[0]?.id ?? null
    dispatch(setSelectedFile(null))
    if (firstChapterId) {
      dispatch(setActiveChapter(firstChapterId))
    }
  }, [dispatch, chapters])

  if (!review) return null

  if (selectedFile) {
    return <DiffPanel filePath={selectedFile} onClose={handleCloseFile} />
  }

  const activeChapter = review.chapters.find((ch) => ch.id === activeChapterId)
  const isSummary = activeChapterId === SUMMARY_SECTION_ID

  if (review.chapters.length === 0) {
    return (
      <div className={styles.scrollContainer}>
        <div className={styles.content}>
          <MarkdownText text={review.overviewSummary} />
          <div className={styles.emptyChapters}>
            The AI did not generate any chapters for this PR. Try regenerating.
          </div>
        </div>
      </div>
    )
  }

  if (isSummary && prData) {
    return (
      <div className={styles.scrollContainer}>
        <div className={styles.content}>
          <div className={styles.srOnly} aria-live="polite">Summary</div>
          <SummaryCard review={review} prData={prData} />
        </div>
      </div>
    )
  }

  if (!activeChapter) return null

  return (
    <div className={styles.scrollContainer}>
      <div className={styles.chapterLayout}>
        {activeChapter.insights.length > 0 && (
          <aside className={styles.insightsSidebar}>
            {activeChapter.insights.map((insight, i) => (
              <InsightCallout key={i} insight={insight} />
            ))}
          </aside>
        )}
        <div className={styles.chapterMain}>
          <div className={styles.srOnly} aria-live="polite">
            {`Chapter: ${activeChapter.title}`}
          </div>
          <ChapterCard key={activeChapter.id} chapter={activeChapter} />
        </div>
      </div>
    </div>
  )
}
