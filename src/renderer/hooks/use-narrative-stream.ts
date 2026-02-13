import { useEffect, useRef } from 'react'

import { recordGenerationDuration } from '../components/GeneratingOverlay'
import {
  appendStreamText,
  selectGenerating,
  setGenerateError,
  setReview,
} from '../store/narrative-slice'
import { addToast } from '../store/ui-slice'

import { useAppDispatch } from './use-app-dispatch'
import { useAppSelector } from './use-app-selector'

export function useNarrativeStream(): void {
  const dispatch = useAppDispatch()
  const generating = useAppSelector(selectGenerating)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (generating) {
      startTimeRef.current = Date.now()
    }
  }, [generating])

  useEffect(() => {
    const unsubChunk = window.api.onNarrativeStreamChunk((chunk) => {
      dispatch(appendStreamText(chunk))
    })

    const unsubComplete = window.api.onNarrativeStreamComplete((review) => {
      console.log('[narrative] review received:', review)
      if (startTimeRef.current !== null) {
        recordGenerationDuration(Date.now() - startTimeRef.current)
        startTimeRef.current = null
      }
      dispatch(setReview(review))
    })

    const unsubError = window.api.onNarrativeStreamError((error) => {
      startTimeRef.current = null
      dispatch(setGenerateError(error))
    })

    const unsubTruncation = window.api.onNarrativeTruncationWarning(() => {
      dispatch(addToast({ message: 'Large PR — some file diffs were truncated for the AI', variant: 'info' }))
    })

    return () => {
      unsubChunk()
      unsubComplete()
      unsubError()
      unsubTruncation()
    }
  }, [dispatch])
}
