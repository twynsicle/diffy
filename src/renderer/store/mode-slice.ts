import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { AppMode } from '../../shared/types'
import type { RootState } from '.'

type ModeState = {
  activeMode: AppMode
}

const initialState: ModeState = {
  activeMode: 'diff-review',
}

const modeSlice = createSlice({
  name: 'mode',
  initialState,
  reducers: {
    setMode(state, action: PayloadAction<AppMode>) {
      state.activeMode = action.payload
    },
  },
})

export const { setMode } = modeSlice.actions
export const modeReducer = modeSlice.reducer

export const selectActiveMode = (state: RootState): AppMode => state.mode.activeMode
