import { useEffect } from 'react'

import { useAppDispatch } from './use-app-dispatch'
import { useAppSelector } from './use-app-selector'
import { selectActiveMode } from '../store/mode-slice'
import {
  selectActiveChapterIndex,
  selectChapterList,
  selectReview,
  setActiveChapter,
} from '../store/narrative-slice'

function scrollToChapter(id: string): void {
  document.getElementById(`chapter-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function useNarrativeKeyboard(): void {
  const dispatch = useAppDispatch()
  const activeMode = useAppSelector(selectActiveMode)
  const review = useAppSelector(selectReview)
  const chapters = useAppSelector(selectChapterList)
  const activeIndex = useAppSelector(selectActiveChapterIndex)

  useEffect(() => {
    if (activeMode !== 'narrative-review' || !review) return

    const handler = (e: KeyboardEvent): void => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const goTo = (index: number): void => {
        const id = chapters[index].id
        e.preventDefault()
        dispatch(setActiveChapter(id))
        scrollToChapter(id)
        document.getElementById(`chapter-heading-${id}`)?.focus()
      }

      if (e.key === 'ArrowRight' || (e.key === ' ' && !e.shiftKey)) {
        if (activeIndex < chapters.length - 1) goTo(activeIndex + 1)
        else e.preventDefault()
      } else if (e.key === 'ArrowLeft' || (e.key === ' ' && e.shiftKey)) {
        if (activeIndex > 0) goTo(activeIndex - 1)
        else e.preventDefault()
      } else if (e.key === 'Home') {
        goTo(0)
      } else if (e.key === 'End') {
        goTo(chapters.length - 1)
      } else if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key, 10) - 1
        if (idx < chapters.length) goTo(idx)
      }
    }

    document.addEventListener('keydown', handler)
    return () => { document.removeEventListener('keydown', handler) }
  }, [dispatch, activeMode, review, chapters, activeIndex])
}
