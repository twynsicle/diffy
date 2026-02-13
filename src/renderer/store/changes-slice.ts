import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

import type { FileChange, Section } from '@shared/types'

import type { RootState } from '.'

type Selection = { path: string; section: Section; origPath?: string }

type ChangesState = {
  staged: FileChange[]
  unstaged: FileChange[]
  selected?: Selection
  statusUpdatedAt: number
  refreshing: boolean
}

const initialState: ChangesState = {
  staged: [],
  unstaged: [],
  statusUpdatedAt: 0,
  refreshing: false,
}

export const refreshStatus = createAsyncThunk<
  { staged: FileChange[]; unstaged: FileChange[] },
  undefined,
  { rejectValue: string }
>('changes/refreshStatus', async (_, { rejectWithValue }) => {
  const result = await window.api.getStatus()
  if (!result.ok) {
    return rejectWithValue(result.error)
  }
  return result.data
})

export const stageFile = createAsyncThunk<undefined, string, { rejectValue: string }>(
  'changes/stageFile',
  async (path, { rejectWithValue }) => {
    const result = await window.api.stageFile(path)
    if (!result.ok) {
      return rejectWithValue(result.error)
    }
    return undefined
  },
)

export const unstageFile = createAsyncThunk<undefined, string, { rejectValue: string }>(
  'changes/unstageFile',
  async (path, { rejectWithValue }) => {
    const result = await window.api.unstageFile(path)
    if (!result.ok) {
      return rejectWithValue(result.error)
    }
    return undefined
  },
)

export const stageAll = createAsyncThunk<undefined, undefined, { rejectValue: string }>(
  'changes/stageAll',
  async (_, { rejectWithValue }) => {
    const result = await window.api.stageAll()
    if (!result.ok) {
      return rejectWithValue(result.error)
    }
    return undefined
  },
)

export const unstageAll = createAsyncThunk<undefined, undefined, { rejectValue: string }>(
  'changes/unstageAll',
  async (_, { rejectWithValue }) => {
    const result = await window.api.unstageAll()
    if (!result.ok) {
      return rejectWithValue(result.error)
    }
    return undefined
  },
)

export const discardFile = createAsyncThunk<undefined, string, { rejectValue: string }>(
  'changes/discardFile',
  async (path, { rejectWithValue }) => {
    const result = await window.api.discardFile(path)
    if (!result.ok) {
      return rejectWithValue(result.error)
    }
    return undefined
  },
)

export const deleteFile = createAsyncThunk<undefined, string, { rejectValue: string }>(
  'changes/deleteFile',
  async (path, { rejectWithValue }) => {
    const result = await window.api.deleteFile(path)
    if (!result.ok) {
      return rejectWithValue(result.error)
    }
    return undefined
  },
)

const changesSlice = createSlice({
  name: 'changes',
  initialState,
  reducers: {
    selectFile(state, action: { payload: Selection }) {
      state.selected = action.payload
    },
    clearSelection(state) {
      state.selected = undefined
    },
  },
  extraReducers: (builder) => {
    builder.addCase(refreshStatus.pending, (state) => {
      state.refreshing = true
    })
    builder.addCase(refreshStatus.rejected, (state) => {
      state.refreshing = false
    })
    builder.addCase(refreshStatus.fulfilled, (state, action) => {
      state.refreshing = false
      state.staged = action.payload.staged
      state.unstaged = action.payload.unstaged
      state.statusUpdatedAt = Date.now()

      // Selection persistence
      if (state.selected) {
        const { path, section } = state.selected
        const sameSection =
          section === 'staged'
            ? action.payload.staged
            : action.payload.unstaged
        const otherSection =
          section === 'staged'
            ? action.payload.unstaged
            : action.payload.staged
        const otherSectionName: Section = section === 'staged' ? 'unstaged' : 'staged'

        if (sameSection.some((f) => f.path === path)) {
          // Still in same section — keep
        } else if (otherSection.some((f) => f.path === path)) {
          // Moved to other section — update
          state.selected = { path, section: otherSectionName }
        } else {
          // Gone from both — clear
          state.selected = undefined
        }
      }
    })
    builder.addCase(stageAll.fulfilled, (state) => {
      state.selected = undefined
    })
    builder.addCase(unstageAll.fulfilled, (state) => {
      state.selected = undefined
    })
  },
})

export const { selectFile, clearSelection } = changesSlice.actions
export const changesReducer = changesSlice.reducer

export const selectStaged = (state: RootState): FileChange[] => state.changes.staged
export const selectUnstaged = (state: RootState): FileChange[] => state.changes.unstaged
export const selectSelected = (state: RootState): Selection | undefined => state.changes.selected
export const selectRefreshing = (state: RootState): boolean => state.changes.refreshing
