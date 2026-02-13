import { type ReactElement, useCallback, useEffect } from 'react'

import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useAppSelector } from '../hooks/use-app-selector'
import { useNarrativeStream } from '../hooks/use-narrative-stream'
import {
  checkGhInstalled,
  clearReview,
  selectGenerateError,
  selectGenerating,
  selectGhInstalled,
  selectPrData,
  selectPrError,
  selectReview,
  selectStreamText,
  startNarrativeGeneration,
} from '../store/narrative-slice'
import { addToast } from '../store/ui-slice'

import { ChapterNav } from './ChapterNav'
import styles from './NarrativeShell.module.css'
import { NarrativeToolbar } from './NarrativeToolbar'
import { NarrativeView } from './NarrativeView'
import { PrInput } from './PrInput'
import { PrSummary } from './PrSummary'

const STREAM_PREVIEW_CHARS = 500

export function NarrativeShell(): ReactElement {
  const dispatch = useAppDispatch()
  const ghInstalled = useAppSelector(selectGhInstalled)
  const prData = useAppSelector(selectPrData)
  const prError = useAppSelector(selectPrError)
  const generating = useAppSelector(selectGenerating)
  const generateError = useAppSelector(selectGenerateError)
  const review = useAppSelector(selectReview)
  const streamText = useAppSelector(selectStreamText)

  useNarrativeStream()

  useEffect(() => {
    if (ghInstalled === null) {
      void dispatch(checkGhInstalled())
    }
  }, [dispatch, ghInstalled])

  const handleGenerate = useCallback(() => {
    if (!prData) return
    void (async () => {
      const result = await window.api.hasApiKey()
      if (!result.ok || !result.data) {
        dispatch(addToast({ message: 'Set your API key in Settings first', variant: 'error' }))
        return
      }
      void dispatch(startNarrativeGeneration(prData))
    })()
  }, [dispatch, prData])

  const handleRegenerate = useCallback(() => {
    if (!prData) return
    dispatch(clearReview())
    void dispatch(startNarrativeGeneration(prData))
  }, [dispatch, prData])

  const handleRetry = useCallback(() => {
    if (!prData) return
    dispatch(clearReview())
    void dispatch(startNarrativeGeneration(prData))
  }, [dispatch, prData])

  const streamPreview = streamText.length > STREAM_PREVIEW_CHARS
    ? '...' + streamText.slice(-STREAM_PREVIEW_CHARS)
    : streamText

  if (review) {
    return (
      <div className={styles.shell}>
        <div className={styles.reviewLayout}>
          <NarrativeToolbar onRegenerate={handleRegenerate} />
          <div className={styles.reviewBody}>
            <NarrativeView />
            <ChapterNav />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.shell}>
      <div className={styles.setupPhase}>
        {ghInstalled === false && (
          <div className={styles.warning}>
            GitHub CLI (gh) not found. Install it from{' '}
            <code>https://cli.github.com</code> and run <code>gh auth login</code>.
          </div>
        )}
        <PrInput />
        {prError && <div className={styles.error}>{prError}</div>}
        {prData && <PrSummary data={prData} />}

        {prData && !generating && !generateError && (
          <button className={styles.generateBtn} onClick={handleGenerate}>
            Generate Review
          </button>
        )}

        {generating && (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <span className={styles.loadingLabel}>Generating narrative review…</span>
            {streamPreview && (
              <pre className={styles.streamPreview}>{streamPreview}</pre>
            )}
          </div>
        )}

        {generateError && (
          <div className={styles.generateError}>
            <span>{generateError}</span>
            <button className={styles.retryBtn} onClick={handleRetry}>
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
