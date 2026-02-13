import { type ReactElement, useEffect, useRef } from 'react'

import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useAppSelector } from '../hooks/use-app-selector'
import {
  selectReview,
  setActiveChapter,
} from '../store/narrative-slice'

import { ChapterCard } from './ChapterCard'
import { MarkdownText } from './MarkdownText'
import styles from './NarrativeView.module.css'

export function NarrativeView(): ReactElement | null {
  const dispatch = useAppDispatch()
  const review = useAppSelector(selectReview)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!review) return

    const root = scrollRef.current
    if (!root) return

    const observer = new IntersectionObserver(
      (entries) => {
        let bestEntry: IntersectionObserverEntry | null = null
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          if (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio) {
            bestEntry = entry
          }
        }
        if (bestEntry) {
          const id = bestEntry.target.id.replace('chapter-', '')
          dispatch(setActiveChapter(id))
        }
      },
      {
        root,
        rootMargin: '-10% 0px -60% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    )

    for (const chapter of review.chapters) {
      const el = document.getElementById(`chapter-${chapter.id}`)
      if (el) observer.observe(el)
    }

    return () => { observer.disconnect() }
  }, [dispatch, review])

  if (!review) return null

  return (
    <div ref={scrollRef} className={styles.scrollContainer}>
      <div className={styles.content}>
        <MarkdownText text={review.overviewSummary} />
        {review.chapters.map((chapter, i) => (
          <ChapterCard key={chapter.id} chapter={chapter} index={i} />
        ))}
      </div>
    </div>
  )
}
