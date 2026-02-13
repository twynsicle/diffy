import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { PrData, PrReference } from '@shared/types'

import type { RootState } from '.'

type NarrativeState = {
  prUrl: string
  prData: PrData | null
  prLoading: boolean
  prError: string | null
  ghInstalled: boolean | null
}

const initialState: NarrativeState = {
  prUrl: '',
  prData: null,
  prLoading: false,
  prError: null,
  ghInstalled: null,
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

const narrativeSlice = createSlice({
  name: 'narrative',
  initialState,
  reducers: {
    setPrUrl(state, action: PayloadAction<string>) {
      state.prUrl = action.payload
    },
    clearPr(state) {
      state.prUrl = ''
      state.prData = null
      state.prLoading = false
      state.prError = null
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
  },
})

export const { setPrUrl, clearPr } = narrativeSlice.actions
export const narrativeReducer = narrativeSlice.reducer

export const selectPrUrl = (state: RootState): string => state.narrative.prUrl
export const selectPrData = (state: RootState): PrData | null => state.narrative.prData
export const selectPrLoading = (state: RootState): boolean => state.narrative.prLoading
export const selectPrError = (state: RootState): string | null => state.narrative.prError
export const selectGhInstalled = (state: RootState): boolean | null => state.narrative.ghInstalled
