import { describe, expect, it } from 'vitest'

import type { NarrativeReview, PrData } from '@shared/types'
import { SUMMARY_SECTION_ID } from '@shared/types'

import type { RootState } from '.'

import {
  appendStreamText,
  clearPr,
  clearReview,
  narrativeReducer,
  selectActiveChapterId,
  selectActiveChapterIndex,
  selectCancelling,
  selectChapterList,
  selectCurrentRequestId,
  selectGenerateError,
  selectGenerating,
  selectGhInstalled,
  selectNarrativeFileList,
  selectNarrativeSource,
  selectPrData,
  selectPrError,
  selectPrLoading,
  selectPrUrl,
  selectRefreshingFiles,
  selectReview,
  selectSelectedNarrativeFile,
  selectStreamText,
  setActiveChapter,
  setGenerateError,
  setReview,
  setSelectedFile,
  setSource,
  setPrUrl,
} from './narrative-slice'

type NarrativeState = ReturnType<typeof narrativeReducer>

function makeReview(overrides?: Partial<NarrativeReview>): NarrativeReview {
  return {
    prTitle: 'Test PR',
    overviewSummary: 'A summary',
    chapters: [
      {
        id: 'ch-1',
        title: 'Chapter 1',
        insights: [{ type: 'context', text: 'Some context' }],
        diffChunks: [],
      },
      {
        id: 'ch-2',
        title: 'Chapter 2',
        insights: [],
        diffChunks: [],
      },
    ],
    ...overrides,
  }
}

function makePrData(overrides?: Partial<PrData>): PrData {
  return {
    title: 'PR Title',
    body: 'PR Body',
    author: 'author',
    baseRefName: 'main',
    headRefName: 'feature',
    files: [{ filename: 'a.ts', status: 'modified', additions: 1, deletions: 0 }],
    diff: 'diff content',
    ...overrides,
  }
}

describe('narrativeReducer — sync actions', () => {
  it('has correct initial state', () => {
    const state = narrativeReducer(undefined, { type: '@@INIT' })
    expect(state.source).toBeNull()
    expect(state.prUrl).toBe('')
    expect(state.prData).toBeNull()
    expect(state.prLoading).toBe(false)
    expect(state.prError).toBeNull()
    expect(state.ghInstalled).toBeNull()
    expect(state.review).toBeNull()
    expect(state.generating).toBe(false)
    expect(state.generateError).toBeNull()
    expect(state.streamText).toBe('')
    expect(state.activeChapterId).toBeNull()
    expect(state.selectedFile).toBeNull()
    expect(state.cancelling).toBe(false)
    expect(state.refreshingFiles).toBe(false)
    expect(state.currentRequestId).toBeNull()
  })

  it('setSource sets the source', () => {
    const state = narrativeReducer(undefined, setSource('github-pr'))
    expect(state.source).toBe('github-pr')
  })

  it('setSource accepts null', () => {
    const state1 = narrativeReducer(undefined, setSource('branch-diff'))
    const state2 = narrativeReducer(state1, setSource(null))
    expect(state2.source).toBeNull()
  })

  it('setPrUrl sets the URL', () => {
    const state = narrativeReducer(undefined, setPrUrl('https://github.com/o/r/pull/1'))
    expect(state.prUrl).toBe('https://github.com/o/r/pull/1')
  })

  it('clearPr resets all narrative state', () => {
    const dirty: NarrativeState = {
      source: 'github-pr',
      prUrl: 'url',
      prData: makePrData(),
      prLoading: true,
      prError: 'err',
      ghInstalled: true,
      review: makeReview(),
      generating: true,
      generateError: 'gen err',
      streamText: 'partial',
      activeChapterId: 'ch-1',
      selectedFile: 'file.ts',
      cancelling: false,
      refreshingFiles: false,
      currentRequestId: 'req-1',
    }
    const state = narrativeReducer(dirty, clearPr())
    expect(state.source).toBeNull()
    expect(state.prUrl).toBe('')
    expect(state.prData).toBeNull()
    expect(state.prLoading).toBe(false)
    expect(state.prError).toBeNull()
    expect(state.review).toBeNull()
    expect(state.generating).toBe(false)
    expect(state.generateError).toBeNull()
    expect(state.streamText).toBe('')
    expect(state.activeChapterId).toBeNull()
    expect(state.selectedFile).toBeNull()
    expect(state.currentRequestId).toBeNull()
  })

  it('appendStreamText accumulates text', () => {
    const state1 = narrativeReducer(undefined, appendStreamText('hello'))
    const state2 = narrativeReducer(state1, appendStreamText(' world'))
    expect(state2.streamText).toBe('hello world')
  })

  it('setActiveChapter sets chapter and clears selectedFile', () => {
    const before: NarrativeState = {
      ...narrativeReducer(undefined, { type: '@@INIT' }),
      selectedFile: 'file.ts',
    }
    const state = narrativeReducer(before, setActiveChapter('ch-1'))
    expect(state.activeChapterId).toBe('ch-1')
    expect(state.selectedFile).toBeNull()
  })

  it('setSelectedFile sets file and clears activeChapterId', () => {
    const before: NarrativeState = {
      ...narrativeReducer(undefined, { type: '@@INIT' }),
      activeChapterId: 'ch-1',
    }
    const state = narrativeReducer(before, setSelectedFile('src/index.ts'))
    expect(state.selectedFile).toBe('src/index.ts')
    expect(state.activeChapterId).toBeNull()
  })

  it('setReview stores the review and auto-selects first chapter', () => {
    const review = makeReview()
    const state = narrativeReducer(undefined, setReview(review))
    expect(state.review).toEqual(review)
    expect(state.generating).toBe(false)
    expect(state.activeChapterId).toBe('ch-1')
  })

  it('setReview sets null activeChapterId when chapters are empty', () => {
    const review = makeReview({ chapters: [] })
    const state = narrativeReducer(undefined, setReview(review))
    expect(state.activeChapterId).toBeNull()
  })

  it('setGenerateError sets error and clears generating/cancelling', () => {
    const before: NarrativeState = {
      ...narrativeReducer(undefined, { type: '@@INIT' }),
      generating: true,
      cancelling: true,
    }
    const state = narrativeReducer(before, setGenerateError('AI error'))
    expect(state.generateError).toBe('AI error')
    expect(state.generating).toBe(false)
    expect(state.cancelling).toBe(false)
  })

  it('clearReview partially resets, preserving source/prUrl/prData', () => {
    const before: NarrativeState = {
      ...narrativeReducer(undefined, { type: '@@INIT' }),
      source: 'github-pr',
      prUrl: 'https://github.com/o/r/pull/1',
      prData: makePrData(),
      review: makeReview(),
      generateError: 'err',
      streamText: 'partial',
      activeChapterId: 'ch-1',
      selectedFile: 'file.ts',
      currentRequestId: 'req-1',
    }
    const state = narrativeReducer(before, clearReview())
    expect(state.source).toBe('github-pr')
    expect(state.prUrl).toBe('https://github.com/o/r/pull/1')
    expect(state.prData).toEqual(makePrData())
    expect(state.review).toBeNull()
    expect(state.generateError).toBeNull()
    expect(state.streamText).toBe('')
    expect(state.activeChapterId).toBeNull()
    expect(state.selectedFile).toBeNull()
    expect(state.currentRequestId).toBeNull()
  })
})

describe('narrativeReducer — async thunk actions', () => {
  it('checkGhInstalled.fulfilled sets ghInstalled', () => {
    const state = narrativeReducer(undefined, {
      type: 'narrative/checkGhInstalled/fulfilled',
      payload: true,
    })
    expect(state.ghInstalled).toBe(true)
  })

  it('checkGhInstalled.rejected sets ghInstalled to false', () => {
    const state = narrativeReducer(undefined, {
      type: 'narrative/checkGhInstalled/rejected',
      error: { message: 'not found' },
    })
    expect(state.ghInstalled).toBe(false)
  })

  it('fetchPr.pending sets loading and clears error/data', () => {
    const state = narrativeReducer(undefined, { type: 'narrative/fetchPr/pending' })
    expect(state.prLoading).toBe(true)
    expect(state.prError).toBeNull()
    expect(state.prData).toBeNull()
  })

  it('fetchPr.fulfilled sets prData', () => {
    const prData = makePrData()
    const state = narrativeReducer(undefined, {
      type: 'narrative/fetchPr/fulfilled',
      payload: prData,
    })
    expect(state.prLoading).toBe(false)
    expect(state.prData).toEqual(prData)
  })

  it('fetchPr.rejected sets prError from payload', () => {
    const state = narrativeReducer(undefined, {
      type: 'narrative/fetchPr/rejected',
      payload: 'PR not found',
      error: {},
    })
    expect(state.prLoading).toBe(false)
    expect(state.prError).toBe('PR not found')
  })

  it('fetchPr.rejected falls back to error.message', () => {
    const state = narrativeReducer(undefined, {
      type: 'narrative/fetchPr/rejected',
      payload: undefined,
      error: { message: 'Network error' },
    })
    expect(state.prError).toBe('Network error')
  })

  it('fetchPr.rejected uses default message', () => {
    const state = narrativeReducer(undefined, {
      type: 'narrative/fetchPr/rejected',
      payload: undefined,
      error: {},
    })
    expect(state.prError).toBe('Failed to fetch PR')
  })

  it('fetchBranchDiff.pending sets loading', () => {
    const state = narrativeReducer(undefined, { type: 'narrative/fetchBranchDiff/pending' })
    expect(state.prLoading).toBe(true)
    expect(state.prError).toBeNull()
    expect(state.prData).toBeNull()
  })

  it('fetchBranchDiff.fulfilled sets prData', () => {
    const prData = makePrData()
    const state = narrativeReducer(undefined, {
      type: 'narrative/fetchBranchDiff/fulfilled',
      payload: prData,
    })
    expect(state.prLoading).toBe(false)
    expect(state.prData).toEqual(prData)
  })

  it('fetchBranchDiff.rejected sets prError', () => {
    const state = narrativeReducer(undefined, {
      type: 'narrative/fetchBranchDiff/rejected',
      payload: 'No default branch',
      error: {},
    })
    expect(state.prLoading).toBe(false)
    expect(state.prError).toBe('No default branch')
  })

  it('fetchUncommittedDiff.pending sets loading', () => {
    const state = narrativeReducer(undefined, { type: 'narrative/fetchUncommittedDiff/pending' })
    expect(state.prLoading).toBe(true)
  })

  it('fetchUncommittedDiff.fulfilled sets prData', () => {
    const prData = makePrData()
    const state = narrativeReducer(undefined, {
      type: 'narrative/fetchUncommittedDiff/fulfilled',
      payload: prData,
    })
    expect(state.prLoading).toBe(false)
    expect(state.prData).toEqual(prData)
  })

  it('fetchUncommittedDiff.rejected sets prError', () => {
    const state = narrativeReducer(undefined, {
      type: 'narrative/fetchUncommittedDiff/rejected',
      payload: 'No changes',
      error: {},
    })
    expect(state.prError).toBe('No changes')
  })

  it('startNarrativeGeneration.pending resets generation state', () => {
    const before: NarrativeState = {
      ...narrativeReducer(undefined, { type: '@@INIT' }),
      review: makeReview(),
      streamText: 'old',
      activeChapterId: 'ch-1',
      currentRequestId: 'old-req',
    }
    const state = narrativeReducer(before, { type: 'narrative/startNarrativeGeneration/pending' })
    expect(state.generating).toBe(true)
    expect(state.generateError).toBeNull()
    expect(state.review).toBeNull()
    expect(state.streamText).toBe('')
    expect(state.activeChapterId).toBeNull()
    expect(state.currentRequestId).toBeNull()
  })

  it('startNarrativeGeneration.fulfilled sets currentRequestId', () => {
    const state = narrativeReducer(undefined, {
      type: 'narrative/startNarrativeGeneration/fulfilled',
      payload: 'gen-123',
    })
    expect(state.currentRequestId).toBe('gen-123')
  })

  it('startNarrativeGeneration.rejected clears generating and sets error', () => {
    const before: NarrativeState = {
      ...narrativeReducer(undefined, { type: '@@INIT' }),
      generating: true,
    }
    const state = narrativeReducer(before, {
      type: 'narrative/startNarrativeGeneration/rejected',
      payload: 'Model unavailable',
      error: {},
    })
    expect(state.generating).toBe(false)
    expect(state.generateError).toBe('Model unavailable')
  })

  it('cancelGeneration.pending sets cancelling', () => {
    const state = narrativeReducer(undefined, { type: 'narrative/cancelGeneration/pending' })
    expect(state.cancelling).toBe(true)
  })

  it('cancelGeneration.fulfilled clears cancelling', () => {
    const before: NarrativeState = {
      ...narrativeReducer(undefined, { type: '@@INIT' }),
      cancelling: true,
    }
    const state = narrativeReducer(before, { type: 'narrative/cancelGeneration/fulfilled' })
    expect(state.cancelling).toBe(false)
  })

  it('cancelGeneration.rejected clears cancelling', () => {
    const before: NarrativeState = {
      ...narrativeReducer(undefined, { type: '@@INIT' }),
      cancelling: true,
    }
    const state = narrativeReducer(before, { type: 'narrative/cancelGeneration/rejected' })
    expect(state.cancelling).toBe(false)
  })

  it('refreshNarrativeFiles.pending sets refreshingFiles', () => {
    const state = narrativeReducer(undefined, { type: 'narrative/refreshNarrativeFiles/pending' })
    expect(state.refreshingFiles).toBe(true)
  })

  it('refreshNarrativeFiles.fulfilled updates prData files and diff', () => {
    const before: NarrativeState = {
      ...narrativeReducer(undefined, { type: '@@INIT' }),
      prData: makePrData({ files: [], diff: 'old' }),
    }
    const newFiles = [{ filename: 'b.ts', status: 'added', additions: 5, deletions: 0 }]
    const state = narrativeReducer(before, {
      type: 'narrative/refreshNarrativeFiles/fulfilled',
      payload: { ...makePrData(), files: newFiles, diff: 'new diff' },
    })
    expect(state.refreshingFiles).toBe(false)
    expect(state.prData?.files).toEqual(newFiles)
    expect(state.prData?.diff).toBe('new diff')
  })

  it('refreshNarrativeFiles.fulfilled does nothing when prData is null', () => {
    const state = narrativeReducer(undefined, {
      type: 'narrative/refreshNarrativeFiles/fulfilled',
      payload: makePrData(),
    })
    expect(state.prData).toBeNull()
  })

  it('refreshNarrativeFiles.rejected clears refreshingFiles', () => {
    const before: NarrativeState = {
      ...narrativeReducer(undefined, { type: '@@INIT' }),
      refreshingFiles: true,
    }
    const state = narrativeReducer(before, { type: 'narrative/refreshNarrativeFiles/rejected' })
    expect(state.refreshingFiles).toBe(false)
  })
})

describe('narrative selectors', () => {
  const makeState = (overrides?: Partial<NarrativeState>): RootState =>
    ({
      narrative: {
        source: null,
        prUrl: '',
        prData: null,
        prLoading: false,
        prError: null,
        ghInstalled: null,
        review: null,
        generating: false,
        generateError: null,
        streamText: '',
        activeChapterId: null,
        selectedFile: null,
        cancelling: false,
        refreshingFiles: false,
        currentRequestId: null,
        ...overrides,
      },
    }) as RootState

  it('selectNarrativeSource', () => {
    expect(selectNarrativeSource(makeState({ source: 'github-pr' }))).toBe('github-pr')
  })

  it('selectPrUrl', () => {
    expect(selectPrUrl(makeState({ prUrl: 'url' }))).toBe('url')
  })

  it('selectPrData', () => {
    const prData = makePrData()
    expect(selectPrData(makeState({ prData }))).toEqual(prData)
  })

  it('selectPrLoading', () => {
    expect(selectPrLoading(makeState({ prLoading: true }))).toBe(true)
  })

  it('selectPrError', () => {
    expect(selectPrError(makeState({ prError: 'err' }))).toBe('err')
  })

  it('selectGhInstalled', () => {
    expect(selectGhInstalled(makeState({ ghInstalled: true }))).toBe(true)
  })

  it('selectReview', () => {
    const review = makeReview()
    expect(selectReview(makeState({ review }))).toEqual(review)
  })

  it('selectGenerating', () => {
    expect(selectGenerating(makeState({ generating: true }))).toBe(true)
  })

  it('selectGenerateError', () => {
    expect(selectGenerateError(makeState({ generateError: 'err' }))).toBe('err')
  })

  it('selectStreamText', () => {
    expect(selectStreamText(makeState({ streamText: 'text' }))).toBe('text')
  })

  it('selectActiveChapterId', () => {
    expect(selectActiveChapterId(makeState({ activeChapterId: 'ch-1' }))).toBe('ch-1')
  })

  it('selectSelectedNarrativeFile', () => {
    expect(selectSelectedNarrativeFile(makeState({ selectedFile: 'a.ts' }))).toBe('a.ts')
  })

  it('selectCurrentRequestId', () => {
    expect(selectCurrentRequestId(makeState({ currentRequestId: 'req-1' }))).toBe('req-1')
  })

  it('selectCancelling', () => {
    expect(selectCancelling(makeState({ cancelling: true }))).toBe(true)
  })

  it('selectRefreshingFiles', () => {
    expect(selectRefreshingFiles(makeState({ refreshingFiles: true }))).toBe(true)
  })

  it('selectNarrativeFileList returns files from prData', () => {
    const files = [{ filename: 'a.ts', status: 'modified', additions: 1, deletions: 0 }]
    expect(selectNarrativeFileList(makeState({ prData: makePrData({ files }) }))).toEqual(files)
  })

  it('selectNarrativeFileList returns empty array when prData is null', () => {
    expect(selectNarrativeFileList(makeState())).toEqual([])
  })

  it('selectChapterList maps chapters to id/title pairs', () => {
    const review = makeReview()
    const result = selectChapterList(makeState({ review }))
    expect(result).toEqual([
      { id: 'ch-1', title: 'Chapter 1' },
      { id: 'ch-2', title: 'Chapter 2' },
    ])
  })

  it('selectChapterList returns empty array when no review', () => {
    expect(selectChapterList(makeState())).toEqual([])
  })

  it('selectActiveChapterIndex returns -1 when no review', () => {
    expect(selectActiveChapterIndex(makeState())).toBe(-1)
  })

  it('selectActiveChapterIndex returns -1 when no activeChapterId', () => {
    expect(selectActiveChapterIndex(makeState({ review: makeReview() }))).toBe(-1)
  })

  it('selectActiveChapterIndex returns index for valid chapter', () => {
    expect(
      selectActiveChapterIndex(makeState({ review: makeReview(), activeChapterId: 'ch-2' })),
    ).toBe(1)
  })

  it('selectActiveChapterIndex returns chapters.length for SUMMARY_SECTION_ID', () => {
    const review = makeReview()
    expect(
      selectActiveChapterIndex(makeState({ review, activeChapterId: SUMMARY_SECTION_ID })),
    ).toBe(review.chapters.length)
  })
})
