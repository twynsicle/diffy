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

import styles from './NarrativeShell.module.css'
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

  return (
    <div className={styles.shell}>
      {ghInstalled === false && (
        <div className={styles.warning}>
          GitHub CLI (gh) not found. Install it from{' '}
          <code>https://cli.github.com</code> and run <code>gh auth login</code>.
        </div>
      )}
      <PrInput />
      {prError && <div className={styles.error}>{prError}</div>}
      {prData && <PrSummary data={prData} />}

      {prData && !generating && !review && !generateError && (
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

      {review && (
        <div className={styles.reviewContainer}>
          <div className={styles.reviewHeader}>
            <h2 className={styles.reviewTitle}>Narrative Review</h2>
            <button className={styles.regenerateBtn} onClick={handleRegenerate}>
              Regenerate
            </button>
          </div>
          <p className={styles.overviewSummary}>{review.overviewSummary}</p>
          <ul className={styles.chapterList}>
            {review.chapters.map((chapter) => (
              <li key={chapter.id} className={styles.chapterItem}>
                <h3 className={styles.chapterTitle}>{chapter.title}</h3>
                <p className={styles.chapterSummary}>{chapter.summary}</p>
                {chapter.diffChunks.length > 0 && (
                  <span className={styles.chunkCount}>
                    {chapter.diffChunks.length} code {chapter.diffChunks.length === 1 ? 'snippet' : 'snippets'}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
