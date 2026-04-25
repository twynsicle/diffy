import { createSlice } from '@reduxjs/toolkit'

import type { RootState } from '.'

type ToastVariant = 'error' | 'info'

export type Toast = {
  id: string
  message: string
  variant: ToastVariant
}

type UiState = {
  toasts: Toast[]
  settingsOpen: boolean
}

const initialState: UiState = {
  toasts: [],
  settingsOpen: false,
}

let nextToastId = 0

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    addToast(state, action: { payload: { message: string; variant: ToastVariant } }) {
      nextToastId += 1
      state.toasts.push({
        id: String(nextToastId),
        message: action.payload.message,
        variant: action.payload.variant,
      })
    },
    dismissToast(state, action: { payload: string }) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload)
    },
    openSettings(state) {
      state.settingsOpen = true
    },
    closeSettings(state) {
      state.settingsOpen = false
    },
  },
})

export const { addToast, dismissToast, openSettings, closeSettings } = uiSlice.actions
export const uiReducer = uiSlice.reducer

export const selectToasts = (state: RootState): Toast[] => state.ui.toasts
export const selectSettingsOpen = (state: RootState): boolean => state.ui.settingsOpen
