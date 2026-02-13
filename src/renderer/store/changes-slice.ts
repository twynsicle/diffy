import { createSlice } from '@reduxjs/toolkit'

import type { FileChange, Section } from '@shared/types'

type ChangesState = {
  staged: FileChange[]
  unstaged: FileChange[]
  selected?: { path: string; section: Section }
  statusUpdatedAt: number
}

const initialState: ChangesState = {
  staged: [],
  unstaged: [],
  statusUpdatedAt: 0,
}

const changesSlice = createSlice({
  name: 'changes',
  initialState,
  reducers: {},
})

export const changesReducer = changesSlice.reducer
