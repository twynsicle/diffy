import { useEffect, useRef } from 'react'

import { recordGenerationDuration } from '../utils/generation-duration'
import { narrativeDebugLog } from '../utils/narrative-debug'
import {
  appendStreamText,
  selectCurrentRequestId,
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
  const currentRequestId = useAppSelector(selectCurrentRequestId)
  const startTimeRef = useRef<number | null>(null)
  const requestIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (generating) {
      startTimeRef.current = Date.now()
    }
  }, [generating])

  useEffect(() => {
    requestIdRef.current = currentRequestId
  }, [currentRequestId])

  useEffect(() => {
    const unsubChunk = window.api.onNarrativeStreamChunk((requestId, chunk) => {
      if (requestIdRef.current !== null && requestId !== requestIdRef.current) return
      narrativeDebugLog('stream chunk', { requestId, chunkLength: chunk.length })
      dispatch(appendStreamText(chunk))
    })

    const unsubComplete = window.api.onNarrativeStreamComplete((requestId, review) => {
      if (requestIdRef.current !== null && requestId !== requestIdRef.current) return
      narrativeDebugLog('stream complete', {
        requestId,
        chapterCount: review.chapters.length,
        chunkCount: review.chapters.reduce((acc, chapter) => acc + chapter.diffChunks.length, 0),
      })
      if (startTimeRef.current !== null) {
        recordGenerationDuration(Date.now() - startTimeRef.current)
        startTimeRef.current = null
      }
      dispatch(setReview(review))
    })

    const unsubError = window.api.onNarrativeStreamError((requestId, error) => {
      if (requestIdRef.current !== null && requestId !== requestIdRef.current) return
      narrativeDebugLog('stream error', { requestId, error })
      startTimeRef.current = null
      dispatch(setGenerateError(error))
    })

    const unsubTruncation = window.api.onNarrativeTruncationWarning((requestId) => {
      if (requestIdRef.current !== null && requestId !== requestIdRef.current) return
      dispatch(
        addToast({
          message: 'Large PR — some file diffs were truncated for the AI',
          variant: 'info',
        }),
      )
    })

    return () => {
      unsubChunk()
      unsubComplete()
      unsubError()
      unsubTruncation()
    }
  }, [dispatch])
}
