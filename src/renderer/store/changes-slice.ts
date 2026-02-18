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

      // Snapshot old section list before overwriting for next-file logic
      const oldSectionFiles = state.selected
        ? (state.selected.section === 'staged' ? [...state.staged] : [...state.unstaged])
        : []

      state.staged = action.payload.staged
      state.unstaged = action.payload.unstaged
      state.statusUpdatedAt = Date.now()

      // Selection persistence: advance to next file when selected file leaves section
      if (state.selected) {
        const { path, section } = state.selected
        const remaining =
          section === 'staged'
            ? action.payload.staged
            : action.payload.unstaged

        if (remaining.some((f) => f.path === path)) {
          // Still in same section — keep
        } else if (remaining.length > 0) {
          // File left section (staged/unstaged/discarded) — select next file
          const oldIndex = oldSectionFiles.findIndex((f) => f.path === path)
          const nextIndex = Math.min(
            oldIndex >= 0 ? oldIndex : 0,
            remaining.length - 1,
          )
          const next = remaining[nextIndex]
          state.selected = { path: next.path, section, origPath: next.origPath }
        } else {
          // No files remain in section — clear
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
