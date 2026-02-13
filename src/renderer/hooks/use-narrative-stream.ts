import { useEffect } from 'react'

import {
  appendStreamText,
  setGenerateError,
  setReview,
} from '../store/narrative-slice'

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

    return () => {
      unsubChunk()
      unsubComplete()
      unsubError()
    }
  }, [dispatch])
}
