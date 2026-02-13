import { createSlice } from '@reduxjs/toolkit'

type RepoState = {
  repoRoot: string | null
  repoDisplayName: string
  status: 'idle' | 'loading' | 'error'
  error?: string
}

const initialState: RepoState = {
  repoRoot: null,
  repoDisplayName: '',
  status: 'idle',
}

const repoSlice = createSlice({
  name: 'repo',
  initialState,
  reducers: {},
})

export const repoReducer = repoSlice.reducer
