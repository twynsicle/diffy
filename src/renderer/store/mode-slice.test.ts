import { describe, expect, it } from 'vitest'

import type { RootState } from '.'

import { modeReducer, selectActiveMode, setMode } from './mode-slice'

describe('modeReducer', () => {
  it('has initial state of diff-review', () => {
    const state = modeReducer(undefined, { type: '@@INIT' })
    expect(state.activeMode).toBe('diff-review')
  })

  it('sets mode to narrative-review', () => {
    const state = modeReducer(undefined, setMode('narrative-review'))
    expect(state.activeMode).toBe('narrative-review')
  })

  it('toggles back to diff-review', () => {
    const state1 = modeReducer(undefined, setMode('narrative-review'))
    const state2 = modeReducer(state1, setMode('diff-review'))
    expect(state2.activeMode).toBe('diff-review')
  })
})

describe('selectActiveMode', () => {
  it('returns the active mode from state', () => {
    const state = { mode: { activeMode: 'narrative-review' } } as RootState
    expect(selectActiveMode(state)).toBe('narrative-review')
  })
})
