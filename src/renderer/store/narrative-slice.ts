import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { NarrativeReview, NarrativeSource, PrData, PrFileChange, PrReference } from '@shared/types'
import { SUMMARY_SECTION_ID } from '@shared/types'
import { parsePrUrl } from '@shared/parse-pr-url'

import type { RootState } from '.'

type NarrativeState = {
  source: NarrativeSource | null
  prUrl: string
  prData: PrData | null
  prLoading: boolean
  prError: string | null
  ghInstalled: boolean | null
  review: NarrativeReview | null
  generating: boolean
  generateError: string | null
  streamText: string
  activeChapterId: string | null
  selectedFile: string | null
  cancelling: boolean
  refreshingFiles: boolean
  currentRequestId: string | null
}

const initialState: NarrativeState = {
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
}

export const checkGhInstalled = createAsyncThunk<boolean, undefined, { rejectValue: string }>(
  'narrative/checkGhInstalled',
  async (_, { rejectWithValue }) => {
    const result = await window.api.checkGhInstalled()
    if (!result.ok) {
      return rejectWithValue(result.error)
    }
    return result.data
  },
)

export const fetchPr = createAsyncThunk<PrData, PrReference, { rejectValue: string }>(
  'narrative/fetchPr',
  async (ref, { rejectWithValue }) => {
    const result = await window.api.fetchPr(ref)
    if (!result.ok) {
      return rejectWithValue(result.error)
    }
    return result.data
  },
)

export const startNarrativeGeneration = createAsyncThunk<string, PrData, { rejectValue: string }>(
  'narrative/startNarrativeGeneration',
  async (prData, { rejectWithValue }) => {
    const result = await window.api.generateNarrative(prData)
    if (!result.ok) {
      return rejectWithValue(result.error)
    }
    return result.data
  },
)

export const cancelGeneration = createAsyncThunk<
  undefined,
  undefined,
  { state: RootState; rejectValue: string }
>(
  'narrative/cancelGeneration',
  async (_, { getState, rejectWithValue }) => {
    const requestId = getState().narrative.currentRequestId ?? undefined
    const result = await window.api.cancelGeneration(requestId)
    if (!result.ok) {
      return rejectWithValue(result.error)
    }
  },
)

export const fetchBranchDiff = createAsyncThunk<PrData, undefined, { rejectValue: string }>(
  'narrative/fetchBranchDiff',
  async (_, { rejectWithValue }) => {
    const result = await window.api.getBranchDiff()
    if (!result.ok) {
      return rejectWithValue(result.error)
    }
    return result.data
  },
)

export const fetchUncommittedDiff = createAsyncThunk<PrData, undefined, { rejectValue: string }>(
  'narrative/fetchUncommittedDiff',
  async (_, { rejectWithValue }) => {
    const result = await window.api.getUncommittedDiff()
    if (!result.ok) {
      return rejectWithValue(result.error)
    }
    return result.data
  },
)

export const refreshNarrativeFiles = createAsyncThunk<
  PrData,
  undefined,
  { state: RootState; rejectValue: string }
>(
  'narrative/refreshNarrativeFiles',
  async (_, { getState, rejectWithValue }) => {
    const { source, prUrl } = getState().narrative

    if (source === 'branch-diff') {
      const result = await window.api.getBranchDiff()
      if (!result.ok) return rejectWithValue(result.error)
      return result.data
    }

    if (source === 'uncommitted') {
      const result = await window.api.getUncommittedDiff()
      if (!result.ok) return rejectWithValue(result.error)
      return result.data
    }

    if (source === 'github-pr' && prUrl) {
      const ref = parsePrUrl(prUrl)
      if (!ref) return rejectWithValue('Invalid PR URL')
      const result = await window.api.fetchPr(ref)
      if (!result.ok) return rejectWithValue(result.error)
      return result.data
    }

    return rejectWithValue('Cannot refresh files for this source')
  },
)

const narrativeSlice = createSlice({
  name: 'narrative',
  initialState,
  reducers: {
    setSource(state, action: PayloadAction<NarrativeSource | null>) {
      state.source = action.payload
    },
    setPrUrl(state, action: PayloadAction<string>) {
      state.prUrl = action.payload
    },
    clearPr(state) {
      state.source = null
      state.prUrl = ''
      state.prData = null
      state.prLoading = false
      state.prError = null
      state.review = null
      state.generating = false
      state.generateError = null
      state.streamText = ''
      state.activeChapterId = null
      state.selectedFile = null
      state.currentRequestId = null
    },
    appendStreamText(state, action: PayloadAction<string>) {
      state.streamText += action.payload
    },
    setActiveChapter(state, action: PayloadAction<string | null>) {
      state.activeChapterId = action.payload
      state.selectedFile = null
    },
    setSelectedFile(state, action: PayloadAction<string | null>) {
      state.selectedFile = action.payload
      state.activeChapterId = null
    },
    setReview(state, action: PayloadAction<NarrativeReview>) {
      state.review = action.payload
      state.generating = false
      state.activeChapterId = action.payload.chapters[0]?.id ?? null
    },
    setGenerateError(state, action: PayloadAction<string>) {
      state.generateError = action.payload
      state.generating = false
      state.cancelling = false
    },
    clearReview(state) {
      state.review = null
      state.generateError = null
      state.streamText = ''
      state.activeChapterId = null
      state.selectedFile = null
      state.currentRequestId = null
    },
  },
  extraReducers: (builder) => {
    builder.addCase(checkGhInstalled.fulfilled, (state, action) => {
      state.ghInstalled = action.payload
    })
    builder.addCase(checkGhInstalled.rejected, (state) => {
      state.ghInstalled = false
    })

    builder.addCase(fetchPr.pending, (state) => {
      state.prLoading = true
      state.prError = null
      state.prData = null
    })
    builder.addCase(fetchPr.fulfilled, (state, action) => {
      state.prLoading = false
      state.prData = action.payload
    })
    builder.addCase(fetchPr.rejected, (state, action) => {
      state.prLoading = false
      state.prError = action.payload ?? action.error.message ?? 'Failed to fetch PR'
    })

    builder.addCase(fetchBranchDiff.pending, (state) => {
      state.prLoading = true
      state.prError = null
      state.prData = null
    })
    builder.addCase(fetchBranchDiff.fulfilled, (state, action) => {
      state.prLoading = false
      state.prData = action.payload
    })
    builder.addCase(fetchBranchDiff.rejected, (state, action) => {
      state.prLoading = false
      state.prError = action.payload ?? action.error.message ?? 'Failed to get branch diff'
    })

    builder.addCase(fetchUncommittedDiff.pending, (state) => {
      state.prLoading = true
      state.prError = null
      state.prData = null
    })
    builder.addCase(fetchUncommittedDiff.fulfilled, (state, action) => {
      state.prLoading = false
      state.prData = action.payload
    })
    builder.addCase(fetchUncommittedDiff.rejected, (state, action) => {
      state.prLoading = false
      state.prError = action.payload ?? action.error.message ?? 'Failed to get uncommitted diff'
    })

    builder.addCase(startNarrativeGeneration.pending, (state) => {
      state.generating = true
      state.generateError = null
      state.review = null
      state.streamText = ''
      state.activeChapterId = null
      state.currentRequestId = null
    })
    builder.addCase(startNarrativeGeneration.fulfilled, (state, action) => {
      state.currentRequestId = action.payload
    })
    builder.addCase(startNarrativeGeneration.rejected, (state, action) => {
      state.generating = false
      state.generateError = action.payload ?? action.error.message ?? 'Failed to start generation'
    })

    builder.addCase(cancelGeneration.pending, (state) => {
      state.cancelling = true
    })
    builder.addCase(cancelGeneration.fulfilled, (state) => {
      state.cancelling = false
    })
    builder.addCase(cancelGeneration.rejected, (state) => {
      state.cancelling = false
    })

    builder.addCase(refreshNarrativeFiles.pending, (state) => {
      state.refreshingFiles = true
    })
    builder.addCase(refreshNarrativeFiles.fulfilled, (state, action) => {
      state.refreshingFiles = false
      if (state.prData) {
        state.prData.files = action.payload.files
        state.prData.diff = action.payload.diff
      }
    })
    builder.addCase(refreshNarrativeFiles.rejected, (state) => {
      state.refreshingFiles = false
    })
  },
})

export const {
  setSource,
  setPrUrl,
  clearPr,
  appendStreamText,
  setActiveChapter,
  setSelectedFile,
  setReview,
  setGenerateError,
  clearReview,
} = narrativeSlice.actions
export const narrativeReducer = narrativeSlice.reducer

export const selectNarrativeSource = (state: RootState): NarrativeSource | null => state.narrative.source
export const selectPrUrl = (state: RootState): string => state.narrative.prUrl
export const selectPrData = (state: RootState): PrData | null => state.narrative.prData
export const selectPrLoading = (state: RootState): boolean => state.narrative.prLoading
export const selectPrError = (state: RootState): string | null => state.narrative.prError
export const selectGhInstalled = (state: RootState): boolean | null => state.narrative.ghInstalled
export const selectReview = (state: RootState): NarrativeReview | null => state.narrative.review
export const selectGenerating = (state: RootState): boolean => state.narrative.generating
export const selectGenerateError = (state: RootState): string | null => state.narrative.generateError
export const selectStreamText = (state: RootState): string => state.narrative.streamText
export const selectActiveChapterId = (state: RootState): string | null => state.narrative.activeChapterId
export const selectChapterList = (state: RootState): { id: string; title: string }[] =>
  state.narrative.review?.chapters.map((ch) => ({ id: ch.id, title: ch.title })) ?? []
export const selectSelectedNarrativeFile = (state: RootState): string | null => state.narrative.selectedFile
export const selectNarrativeFileList = (state: RootState): PrFileChange[] =>
  state.narrative.prData?.files ?? []
export const selectCurrentRequestId = (state: RootState): string | null => state.narrative.currentRequestId
export const selectCancelling = (state: RootState): boolean => state.narrative.cancelling
export const selectRefreshingFiles = (state: RootState): boolean => state.narrative.refreshingFiles
export const selectActiveChapterIndex = (state: RootState): number => {
  const { review, activeChapterId } = state.narrative
  if (!review || !activeChapterId) return -1
  if (activeChapterId === SUMMARY_SECTION_ID) return review.chapters.length
  return review.chapters.findIndex((ch) => ch.id === activeChapterId)
}
