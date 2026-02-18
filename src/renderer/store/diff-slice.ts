import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

import type { DiffRequest } from '@shared/types'

import type { RootState } from '.'

type DiffState = {
  loading: boolean
  wrapEnabled: boolean
  original: string
  modified: string
  language: string
  isBinary: boolean
  error?: string
  currentRequestId?: string
  lastRequest?: DiffRequest
}

const initialState: DiffState = {
  loading: false,
  wrapEnabled: false,
  original: '',
  modified: '',
  language: 'plaintext',
  isBinary: false,
}

export const loadDiff = createAsyncThunk<
  { original: string; modified: string; language: string; isBinary: boolean },
  DiffRequest,
  { rejectValue: string }
>('diff/loadDiff', async (request, { rejectWithValue }) => {
  const result = await window.api.getDiffContent(request)
  if (!result.ok) {
    return rejectWithValue(result.error)
  }
  return result.data
})

const diffSlice = createSlice({
  name: 'diff',
  initialState,
  reducers: {
    toggleWrap(state) {
      state.wrapEnabled = !state.wrapEnabled
    },
    clearDiff(state) {
      state.loading = false
      state.original = ''
      state.modified = ''
      state.language = 'plaintext'
      state.isBinary = false
      state.error = undefined
      state.currentRequestId = undefined
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadDiff.pending, (state, action) => {
      state.loading = true
      state.error = undefined
      state.currentRequestId = action.meta.requestId
      state.lastRequest = action.meta.arg
    })
    builder.addCase(loadDiff.fulfilled, (state, action) => {
      if (state.currentRequestId !== action.meta.requestId) return
      state.loading = false
      state.original = action.payload.original
      state.modified = action.payload.modified
      state.language = action.payload.language
      state.isBinary = action.payload.isBinary
    })
    builder.addCase(loadDiff.rejected, (state, action) => {
      if (state.currentRequestId !== action.meta.requestId) return
      state.loading = false
      state.error = action.payload ?? action.error.message ?? 'Failed to load diff'
    })
  },
})

export const { toggleWrap, clearDiff } = diffSlice.actions
export const diffReducer = diffSlice.reducer

export const selectDiffLoading = (state: RootState): boolean => state.diff.loading
export const selectDiffOriginal = (state: RootState): string => state.diff.original
export const selectDiffModified = (state: RootState): string => state.diff.modified
export const selectDiffLanguage = (state: RootState): string => state.diff.language
export const selectDiffIsBinary = (state: RootState): boolean => state.diff.isBinary
export const selectDiffError = (state: RootState): string | undefined => state.diff.error
export const selectWrapEnabled = (state: RootState): boolean => state.diff.wrapEnabled
export const selectDiffLastRequest = (state: RootState): DiffRequest | undefined => state.diff.lastRequest
