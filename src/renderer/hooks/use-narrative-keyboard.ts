import { useEffect } from 'react'

import { SUMMARY_SECTION_ID } from '@shared/types'

import { useAppDispatch } from './use-app-dispatch'
import { useAppSelector } from './use-app-selector'
import { selectActiveMode } from '../store/mode-slice'
import {
  selectActiveChapterId,
  selectActiveChapterIndex,
  selectChapterList,
  selectReview,
  setActiveChapter,
} from '../store/narrative-slice'

export function useNarrativeKeyboard(): void {
  const dispatch = useAppDispatch()
  const activeMode = useAppSelector(selectActiveMode)
  const review = useAppSelector(selectReview)
  const chapters = useAppSelector(selectChapterList)
  const activeIndex = useAppSelector(selectActiveChapterIndex)
  const activeId = useAppSelector(selectActiveChapterId)

  useEffect(() => {
    if (activeMode !== 'narrative-review' || !review) return

    const isSummary = activeId === SUMMARY_SECTION_ID

    const handler = (e: KeyboardEvent): void => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const goToChapter = (index: number): void => {
        const id = chapters[index].id
        e.preventDefault()
        dispatch(setActiveChapter(id))
        requestAnimationFrame(() => {
          document.getElementById(`chapter-heading-${id}`)?.focus()
        })
      }

      const goToSummary = (): void => {
        e.preventDefault()
        dispatch(setActiveChapter(SUMMARY_SECTION_ID))
        requestAnimationFrame(() => {
          document.getElementById('chapter-heading-__summary__')?.focus()
        })
      }

      if (e.key === 'ArrowRight' || (e.key === ' ' && !e.shiftKey)) {
        if (isSummary) {
          e.preventDefault()
        } else if (activeIndex < chapters.length - 1) {
          goToChapter(activeIndex + 1)
        } else if (activeIndex === chapters.length - 1) {
          goToSummary()
        } else {
          e.preventDefault()
        }
      } else if (e.key === 'ArrowLeft' || (e.key === ' ' && e.shiftKey)) {
        if (isSummary) {
          if (chapters.length > 0) goToChapter(chapters.length - 1)
          else e.preventDefault()
        } else if (activeIndex > 0) {
          goToChapter(activeIndex - 1)
        } else {
          e.preventDefault()
        }
      } else if (e.key === 'Home') {
        goToChapter(0)
      } else if (e.key === 'End') {
        goToSummary()
      } else if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key, 10) - 1
        if (idx < chapters.length) goToChapter(idx)
      }
    }

    document.addEventListener('keydown', handler)
    return () => { document.removeEventListener('keydown', handler) }
  }, [dispatch, activeMode, review, chapters, activeIndex, activeId])
}
