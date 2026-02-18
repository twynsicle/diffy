import { type ReactElement, useCallback, useState } from 'react'

import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useAppSelector } from '../hooks/use-app-selector'
import { useNarrativeStream } from '../hooks/use-narrative-stream'
import {
  clearPr,
  clearReview,
  selectGenerateError,
  selectGenerating,
  selectNarrativeSource,
  selectPrData,
  selectPrError,
  selectPrLoading,
  selectReview,
  selectSelectedNarrativeFile,
  selectStreamText,
  startNarrativeGeneration,
} from '../store/narrative-slice'
import { addToast } from '../store/ui-slice'

import { ChapterNav } from './ChapterNav'
import { ChapterNavBar } from './ChapterNavBar'
import { GeneratingOverlay } from './GeneratingOverlay'
import styles from './NarrativeShell.module.css'
import { NarrativeToolbar } from './NarrativeToolbar'
import { NarrativeView } from './NarrativeView'
import { PrInput } from './PrInput'
import { PrSummary } from './PrSummary'
import { RawResponseModal } from './RawResponseModal'
import { SourceSelect } from './SourceSelect'

export function NarrativeShell(): ReactElement {
  const dispatch = useAppDispatch()
  const source = useAppSelector(selectNarrativeSource)
  const prData = useAppSelector(selectPrData)
  const prLoading = useAppSelector(selectPrLoading)
  const prError = useAppSelector(selectPrError)
  const generating = useAppSelector(selectGenerating)
  const generateError = useAppSelector(selectGenerateError)
  const review = useAppSelector(selectReview)
  const streamText = useAppSelector(selectStreamText)
  const selectedFile = useAppSelector(selectSelectedNarrativeFile)
  const [showRaw, setShowRaw] = useState(false)

  useNarrativeStream()

  const handleGenerate = useCallback(() => {
    if (!prData) return
    void (async () => {
      const providerResult = await window.api.getAiProvider()
      const provider = providerResult.ok ? providerResult.data : 'api'

      if (provider === 'api') {
        const result = await window.api.hasApiKey()
        if (!result.ok || !result.data) {
          dispatch(addToast({ message: 'Set your API key in Settings first', variant: 'error' }))
          return
        }
      } else {
        const result = await window.api.checkClaudeCliInstalled()
        if (!result.ok || !result.data) {
          dispatch(addToast({ message: 'Claude CLI not found. Install Claude Code and try again.', variant: 'error' }))
          return
        }
      }

      void dispatch(startNarrativeGeneration(prData))
    })()
  }, [dispatch, prData])

  const handleRegenerate = useCallback(() => {
    if (!prData) return
    dispatch(clearReview())
    void dispatch(startNarrativeGeneration(prData))
  }, [dispatch, prData])

  const handleBack = useCallback(() => {
    dispatch(clearPr())
  }, [dispatch])

  const handleCloseReview = useCallback(() => {
    dispatch(clearReview())
    dispatch(clearPr())
  }, [dispatch])

  const handleRetry = useCallback(() => {
    if (!prData) return
    dispatch(clearReview())
    void dispatch(startNarrativeGeneration(prData))
  }, [dispatch, prData])

  const isParseError = generateError
    ? generateError.includes('parse') || generateError.includes('tags')
    : false

  // Phase: Review
  if (review) {
    return (
      <div className={styles.shell}>
        <div className={styles.reviewLayout}>
          <NarrativeToolbar onRegenerate={handleRegenerate} onClose={handleCloseReview} />
          <div className={styles.reviewBody}>
            <NarrativeView />
            <ChapterNav />
          </div>
          {!selectedFile && <ChapterNavBar />}
        </div>
      </div>
    )
  }

  // Phase: Source selection
  if (source === null) {
    return (
      <div className={styles.shell}>
        <SourceSelect />
      </div>
    )
  }

  // Phase: GitHub PR input
  if (source === 'github-pr' && !prData && !prLoading && !prError) {
    return (
      <div className={styles.shell}>
        <div className={styles.inputPhase}>
          <PrInput onBack={handleBack} />
        </div>
      </div>
    )
  }

  // Phase: Loading (branch-diff or uncommitted fetch, or PR fetch)
  if (!prData && prLoading) {
    return (
      <div className={styles.shell}>
        <div className={styles.inputPhase}>
          <div className={styles.loadingText}>Loading...</div>
        </div>
      </div>
    )
  }

  // Phase: Error fetching source data
  if (!prData && prError) {
    return (
      <div className={styles.shell}>
        <div className={styles.inputPhase}>
          <div className={styles.error}>{prError}</div>
          <button className={styles.cancelBtn} onClick={handleBack} type="button">
            Back
          </button>
        </div>
      </div>
    )
  }

  // Phase: PR summary + generate
  if (!prData) {
    return (
      <div className={styles.shell}>
        <div className={styles.inputPhase}>
          <div className={styles.loadingText}>Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.shell}>
      <div className={styles.setupPhase}>
        <PrSummary data={prData} />

        {!generating && !generateError && prData.files.length > 0 && (
          <div className={styles.setupActions}>
            <button className={styles.cancelBtn} onClick={handleBack} type="button">
              Back
            </button>
            <button className={styles.generateBtn} onClick={handleGenerate} type="button">
              Generate Review
            </button>
          </div>
        )}

        {!generating && !generateError && prData.files.length === 0 && (
          <div className={styles.emptyState}>
            <span>No file changes to review.</span>
            <button className={styles.cancelBtn} onClick={handleBack} type="button">
              Back
            </button>
          </div>
        )}

        {generating && <GeneratingOverlay />}

        {generateError && (
          <div className={styles.generateError}>
            <span>{generateError}</span>
            <div className={styles.errorActions}>
              <button className={styles.retryBtn} onClick={handleRetry}>
                Retry
              </button>
              {isParseError && streamText && (
                <button className={styles.rawBtn} onClick={() => { setShowRaw(true) }}>
                  View Raw Response
                </button>
              )}
            </div>
          </div>
        )}

        {showRaw && <RawResponseModal text={streamText} onClose={() => { setShowRaw(false) }} />}
      </div>
    </div>
  )
}
