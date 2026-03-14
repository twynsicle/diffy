import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react'

import { parsePrUrl } from '@shared/parse-pr-url'
import type {
  NarrativeCacheContext,
  NarrativeCacheLookup,
  NarrativeGenerationRequest,
} from '@shared/types'

import { useAppDispatch } from '../../hooks/use-app-dispatch'
import { useAppSelector } from '../../hooks/use-app-selector'
import {
  clearPr,
  clearCachedReview,
  clearReview,
  hydrateCachedReview,
  loadCachedNarrativeReview,
  selectCachedReview,
  selectCachedReviewLoading,
  selectCurrentRequestId,
  selectGenerateError,
  selectGenerating,
  setGenerateError,
  selectNarrativeSource,
  selectPrData,
  selectPrError,
  selectPrLoading,
  selectPrUrl,
  selectReview,
  selectSelectedNarrativeFile,
  selectStreamText,
  startNarrativeGeneration,
} from '../../store/narrative-slice'
import {
  loadSettings,
  selectAiProvider,
  selectCliInstalled,
  selectHasApiKey,
  selectSettingsLoaded,
} from '../../store/settings-slice'
import { addToast } from '../../store/ui-slice'

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
  const prUrl = useAppSelector(selectPrUrl)
  const prLoading = useAppSelector(selectPrLoading)
  const prError = useAppSelector(selectPrError)
  const generating = useAppSelector(selectGenerating)
  const currentRequestId = useAppSelector(selectCurrentRequestId)
  const generateError = useAppSelector(selectGenerateError)
  const review = useAppSelector(selectReview)
  const cachedReview = useAppSelector(selectCachedReview)
  const cachedReviewLoading = useAppSelector(selectCachedReviewLoading)
  const streamText = useAppSelector(selectStreamText)
  const selectedFile = useAppSelector(selectSelectedNarrativeFile)
  const settingsLoaded = useAppSelector(selectSettingsLoaded)
  const aiProvider = useAppSelector(selectAiProvider)
  const hasApiKey = useAppSelector(selectHasApiKey)
  const cliInstalled = useAppSelector(selectCliInstalled)
  const [showRaw, setShowRaw] = useState(false)

  // Load settings on mount if not already loaded
  useEffect(() => {
    if (!settingsLoaded) {
      void dispatch(loadSettings())
    }
  }, [settingsLoaded, dispatch])

  // Safety net: if generating is stuck true from a prior session (e.g. app restart)
  // but there's no active request, reset the state so the user isn't stuck.
  useEffect(() => {
    if (generating && !currentRequestId) {
      dispatch(setGenerateError('Generation was interrupted. Please try again.'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const prRef = useMemo(() => (source === 'github-pr' ? parsePrUrl(prUrl) : null), [source, prUrl])

  const cacheLookup = useMemo<NarrativeCacheLookup | null>(() => {
    if (!source || !prData) return null

    if (source === 'github-pr') {
      const ref = prRef
      return ref ? { source, prRef: ref, cacheContext: { source } } : null
    }

    if (source === 'branch-diff' && prData.cacheMetadata?.source === 'branch-diff') {
      return {
        source,
        cacheContext: prData.cacheMetadata,
      }
    }

    if (source === 'uncommitted' && prData.cacheMetadata?.source === 'uncommitted') {
      return {
        source,
        cacheContext: prData.cacheMetadata,
      }
    }

    return null
  }, [source, prData, prRef])

  const generationRequest = useMemo<NarrativeGenerationRequest | null>(() => {
    if (!source || !prData) return null

    let cacheContext: NarrativeCacheContext | null = null
    let currentPrRef: typeof prRef | undefined

    if (source === 'github-pr') {
      const ref = prRef
      if (!ref) return null
      currentPrRef = ref
      cacheContext = { source }
    } else if (source === 'branch-diff' && prData.cacheMetadata?.source === 'branch-diff') {
      cacheContext = prData.cacheMetadata
    } else if (source === 'uncommitted' && prData.cacheMetadata?.source === 'uncommitted') {
      cacheContext = prData.cacheMetadata
    }

    if (!cacheContext) return null

    return {
      source,
      prData,
      prRef: currentPrRef,
      cacheContext,
    }
  }, [source, prData, prRef])

  const generationUnavailableReason = useMemo<string | null>(() => {
    if (!source || !prData || generationRequest) {
      return null
    }

    if (source === 'github-pr') {
      return 'Cannot generate review because the current PR URL could not be parsed.'
    }

    if (source === 'branch-diff') {
      return 'Cannot generate review because branch cache metadata is missing from the current diff.'
    }

    return 'Cannot generate review because uncommitted diff metadata is missing from the current diff.'
  }, [source, prData, generationRequest])

  useEffect(() => {
    if (!cacheLookup || review) {
      dispatch(clearCachedReview())
      return
    }

    void dispatch(loadCachedNarrativeReview(cacheLookup))
  }, [cacheLookup, review, dispatch])

  const handleGenerate = useCallback(() => {
    if (!generationRequest) {
      if (generationUnavailableReason) {
        dispatch(setGenerateError(generationUnavailableReason))
      }
      return
    }

    if (aiProvider === 'api') {
      if (!hasApiKey) {
        dispatch(addToast({ message: 'Set your API key in Settings first', variant: 'error' }))
        return
      }
    } else {
      if (!cliInstalled) {
        dispatch(
          addToast({
            message: 'Claude CLI not found. Install Claude Code and try again.',
            variant: 'error',
          }),
        )
        return
      }
    }

    void dispatch(startNarrativeGeneration(generationRequest))
  }, [
    dispatch,
    generationRequest,
    generationUnavailableReason,
    aiProvider,
    hasApiKey,
    cliInstalled,
  ])

  const handleRegenerate = useCallback(() => {
    if (!generationRequest) {
      if (generationUnavailableReason) {
        dispatch(setGenerateError(generationUnavailableReason))
      }
      return
    }
    dispatch(clearReview())
    void dispatch(startNarrativeGeneration(generationRequest))
  }, [dispatch, generationRequest, generationUnavailableReason])

  const handleBack = useCallback(() => {
    dispatch(clearPr())
  }, [dispatch])

  const handleCloseReview = useCallback(() => {
    dispatch(clearReview())
    dispatch(clearPr())
  }, [dispatch])

  const handleRetry = useCallback(() => {
    if (!generationRequest) {
      if (generationUnavailableReason) {
        dispatch(setGenerateError(generationUnavailableReason))
      }
      return
    }
    dispatch(clearReview())
    void dispatch(startNarrativeGeneration(generationRequest))
  }, [dispatch, generationRequest, generationUnavailableReason])

  const handleLoadCachedReview = useCallback(() => {
    if (!cachedReview) return
    dispatch(hydrateCachedReview(cachedReview))
  }, [dispatch, cachedReview])

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
            {cachedReview && !cachedReviewLoading ? (
              <>
                <button className={styles.cancelBtn} onClick={handleLoadCachedReview} type="button">
                  Load last review
                </button>
                <button className={styles.generateBtn} onClick={handleGenerate} type="button">
                  Generate New Review
                </button>
              </>
            ) : (
              <button className={styles.generateBtn} onClick={handleGenerate} type="button">
                Generate Review
              </button>
            )}
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
                <button
                  className={styles.rawBtn}
                  onClick={() => {
                    setShowRaw(true)
                  }}
                >
                  View Raw Response
                </button>
              )}
            </div>
          </div>
        )}

        {showRaw && (
          <RawResponseModal
            text={streamText}
            onClose={() => {
              setShowRaw(false)
            }}
          />
        )}
      </div>
    </div>
  )
}
