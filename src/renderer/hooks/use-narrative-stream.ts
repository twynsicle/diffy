import { useEffect } from 'react'

import {
  appendStreamText,
  setGenerateError,
  setReview,
} from '../store/narrative-slice'
import { addToast } from '../store/ui-slice'

import { useAppDispatch } from './use-app-dispatch'

export function useNarrativeStream(): void {
  const dispatch = useAppDispatch()

  useEffect(() => {
    const unsubChunk = window.api.onNarrativeStreamChunk((chunk) => {
      dispatch(appendStreamText(chunk))
    })

    const unsubComplete = window.api.onNarrativeStreamComplete((review) => {
      dispatch(setReview(review))
    })

    const unsubError = window.api.onNarrativeStreamError((error) => {
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
