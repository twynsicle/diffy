import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

import type { RootState } from '.'

type RepoState = {
  repoRoot: string | null
  repoDisplayName: string
  branch: string
  status: 'idle' | 'loading' | 'error'
  error?: string
}

const initialState: RepoState = {
  repoRoot: null,
  repoDisplayName: '',
  branch: '',
  status: 'idle',
}

export const fetchBranch = createAsyncThunk<string, undefined, { rejectValue: string }>(
  'repo/fetchBranch',
  async (_, { rejectWithValue }) => {
    const result = await window.api.getBranch()
    if (!result.ok) {
      return rejectWithValue(result.error)
    }
    return result.data
  },
)

export const openRepo = createAsyncThunk<
  { repoRoot: string; displayName: string },
  string,
  { rejectValue: string }
>('repo/open', async (folderPath, { rejectWithValue }) => {
  const result = await window.api.openRepo(folderPath)
  if (!result.ok) {
    return rejectWithValue(result.error)
  }
  return result.data
})

const repoSlice = createSlice({
  name: 'repo',
  initialState,
  reducers: {
    clearError(state) {
      state.error = undefined
      state.status = state.repoRoot ? 'idle' : 'idle'
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(openRepo.pending, (state) => {
        state.status = 'loading'
        state.error = undefined
      })
      .addCase(openRepo.fulfilled, (state, action) => {
        state.status = 'idle'
        state.repoRoot = action.payload.repoRoot
        state.repoDisplayName = action.payload.displayName
        state.error = undefined
      })
      .addCase(openRepo.rejected, (state, action) => {
        state.status = 'error'
        state.error = action.payload ?? 'Failed to open repository'
      })
      .addCase(fetchBranch.fulfilled, (state, action) => {
        state.branch = action.payload
      })
  },
})

export const { clearError } = repoSlice.actions
export const repoReducer = repoSlice.reducer

export const selectRepoRoot = (state: RootState): string | null => state.repo.repoRoot
export const selectRepoDisplayName = (state: RootState): string => state.repo.repoDisplayName
export const selectRepoStatus = (state: RootState): RepoState['status'] => state.repo.status
export const selectRepoError = (state: RootState): string | undefined => state.repo.error
export const selectBranch = (state: RootState): string => state.repo.branch
