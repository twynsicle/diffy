import { describe, expect, it } from 'vitest'

import type { RootState } from '.'

import {
  addToast,
  closeConfirmModal,
  closeSettings,
  dismissToast,
  openSettings,
  selectConfirmModal,
  selectSettingsOpen,
  selectToasts,
  showConfirmModal,
  uiReducer,
} from './ui-slice'

describe('uiReducer', () => {
  it('has correct initial state', () => {
    const state = uiReducer(undefined, { type: '@@INIT' })
    expect(state.toasts).toEqual([])
    expect(state.confirmModal.open).toBe(false)
    expect(state.settingsOpen).toBe(false)
  })

  it('addToast pushes a toast with a unique id', () => {
    const state1 = uiReducer(undefined, addToast({ message: 'Error 1', variant: 'error' }))
    expect(state1.toasts).toHaveLength(1)
    expect(state1.toasts[0].message).toBe('Error 1')
    expect(state1.toasts[0].variant).toBe('error')

    const state2 = uiReducer(state1, addToast({ message: 'Info 1', variant: 'info' }))
    expect(state2.toasts).toHaveLength(2)
    expect(state2.toasts[0].id).not.toBe(state2.toasts[1].id)
  })

  it('dismissToast removes a toast by id', () => {
    const state1 = uiReducer(undefined, addToast({ message: 'msg', variant: 'error' }))
    const id = state1.toasts[0].id
    const state2 = uiReducer(state1, dismissToast(id))
    expect(state2.toasts).toHaveLength(0)
  })

  it('dismissToast ignores unknown ids', () => {
    const state1 = uiReducer(undefined, addToast({ message: 'msg', variant: 'error' }))
    const state2 = uiReducer(state1, dismissToast('nonexistent'))
    expect(state2.toasts).toHaveLength(1)
  })

  it('showConfirmModal opens the modal with details', () => {
    const state = uiReducer(
      undefined,
      showConfirmModal({
        title: 'Confirm Delete',
        message: 'Are you sure?',
        onConfirmAction: { type: 'delete', path: 'file.ts' },
      }),
    )
    expect(state.confirmModal.open).toBe(true)
    expect(state.confirmModal.title).toBe('Confirm Delete')
    expect(state.confirmModal.message).toBe('Are you sure?')
    expect(state.confirmModal.onConfirmAction).toEqual({ type: 'delete', path: 'file.ts' })
  })

  it('closeConfirmModal resets the modal', () => {
    const state1 = uiReducer(
      undefined,
      showConfirmModal({
        title: 'Title',
        message: 'Msg',
        onConfirmAction: { type: 'discard', path: 'a.ts' },
      }),
    )
    const state2 = uiReducer(state1, closeConfirmModal())
    expect(state2.confirmModal.open).toBe(false)
    expect(state2.confirmModal.title).toBe('')
    expect(state2.confirmModal.message).toBe('')
  })

  it('openSettings sets settingsOpen to true', () => {
    const state = uiReducer(undefined, openSettings())
    expect(state.settingsOpen).toBe(true)
  })

  it('closeSettings sets settingsOpen to false', () => {
    const state1 = uiReducer(undefined, openSettings())
    const state2 = uiReducer(state1, closeSettings())
    expect(state2.settingsOpen).toBe(false)
  })
})

describe('ui selectors', () => {
  it('selectToasts returns toasts array', () => {
    const state = {
      ui: {
        toasts: [{ id: '1', message: 'hi', variant: 'info' as const }],
        confirmModal: { open: false, title: '', message: '' },
        settingsOpen: false,
      },
    } as RootState
    expect(selectToasts(state)).toHaveLength(1)
  })

  it('selectConfirmModal returns the confirm modal state', () => {
    const modal = { open: true, title: 'T', message: 'M' }
    const state = { ui: { toasts: [], confirmModal: modal, settingsOpen: false } } as RootState
    expect(selectConfirmModal(state)).toEqual(modal)
  })

  it('selectSettingsOpen returns the settings open flag', () => {
    const state = {
      ui: { toasts: [], confirmModal: { open: false, title: '', message: '' }, settingsOpen: true },
    } as RootState
    expect(selectSettingsOpen(state)).toBe(true)
  })
})
