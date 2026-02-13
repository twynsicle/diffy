import { createSlice } from '@reduxjs/toolkit'

import type { RootState } from '.'

type ToastVariant = 'error' | 'info'

export type Toast = {
  id: string
  message: string
  variant: ToastVariant
}

type ConfirmAction =
  | { type: 'discard'; path: string }
  | { type: 'delete'; path: string }

type ConfirmModal = {
  open: boolean
  title: string
  message: string
  onConfirmAction?: ConfirmAction
}

type UiState = {
  toasts: Toast[]
  confirmModal: ConfirmModal
  settingsOpen: boolean
}

const initialState: UiState = {
  toasts: [],
  confirmModal: {
    open: false,
    title: '',
    message: '',
  },
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
    showConfirmModal(
      state,
      action: { payload: { title: string; message: string; onConfirmAction: ConfirmAction } },
    ) {
      state.confirmModal = {
        open: true,
        title: action.payload.title,
        message: action.payload.message,
        onConfirmAction: action.payload.onConfirmAction,
      }
    },
    closeConfirmModal(state) {
      state.confirmModal = { open: false, title: '', message: '' }
    },
    openSettings(state) {
      state.settingsOpen = true
    },
    closeSettings(state) {
      state.settingsOpen = false
    },
  },
})

export const { addToast, dismissToast, showConfirmModal, closeConfirmModal, openSettings, closeSettings } = uiSlice.actions
export const uiReducer = uiSlice.reducer

export const selectToasts = (state: RootState): Toast[] => state.ui.toasts
export const selectConfirmModal = (state: RootState): ConfirmModal => state.ui.confirmModal
export const selectSettingsOpen = (state: RootState): boolean => state.ui.settingsOpen
