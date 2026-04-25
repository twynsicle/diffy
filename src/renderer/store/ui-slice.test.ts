import { describe, expect, it } from 'vitest'

import type { RootState } from '.'

import {
  addToast,
  closeSettings,
  dismissToast,
  openSettings,
  selectSettingsOpen,
  selectToasts,
  uiReducer,
} from './ui-slice'

describe('uiReducer', () => {
  it('has correct initial state', () => {
    const state = uiReducer(undefined, { type: '@@INIT' })
    expect(state.toasts).toEqual([])
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
        settingsOpen: false,
      },
    } as RootState
    expect(selectToasts(state)).toHaveLength(1)
  })

  it('selectSettingsOpen returns the settings open flag', () => {
    const state = {
      ui: { toasts: [], settingsOpen: true },
    } as RootState
    expect(selectSettingsOpen(state)).toBe(true)
  })
})
