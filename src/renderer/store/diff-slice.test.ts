import { describe, expect, it } from 'vitest'

import type { RootState } from '.'

import {
  clearDiff,
  diffReducer,
  selectDiffError,
  selectDiffIsBinary,
  selectDiffLanguage,
  selectDiffLoading,
  selectDiffModified,
  selectDiffOriginal,
  selectWrapEnabled,
  toggleWrap,
} from './diff-slice'

type DiffState = ReturnType<typeof diffReducer>

function makeAction(type: string, payload?: unknown, requestId = 'req-1') {
  return { type, payload, meta: { requestId, arg: {} } }
}

describe('diffReducer', () => {
  it('has correct initial state', () => {
    const state = diffReducer(undefined, { type: '@@INIT' })
    expect(state.loading).toBe(false)
    expect(state.wrapEnabled).toBe(false)
    expect(state.original).toBe('')
    expect(state.modified).toBe('')
    expect(state.language).toBe('plaintext')
    expect(state.isBinary).toBe(false)
    expect(state.error).toBeUndefined()
    expect(state.currentRequestId).toBeUndefined()
  })

  it('toggleWrap flips wrapEnabled', () => {
    const state1 = diffReducer(undefined, toggleWrap())
    expect(state1.wrapEnabled).toBe(true)
    const state2 = diffReducer(state1, toggleWrap())
    expect(state2.wrapEnabled).toBe(false)
  })

  it('clearDiff resets diff state', () => {
    const loaded: DiffState = {
      loading: true,
      wrapEnabled: true,
      original: 'orig',
      modified: 'mod',
      language: 'typescript',
      isBinary: true,
      error: 'some error',
      currentRequestId: 'req-1',
    }
    const state = diffReducer(loaded, clearDiff())
    expect(state.loading).toBe(false)
    expect(state.original).toBe('')
    expect(state.modified).toBe('')
    expect(state.language).toBe('plaintext')
    expect(state.isBinary).toBe(false)
    expect(state.error).toBeUndefined()
    expect(state.currentRequestId).toBeUndefined()
    // wrapEnabled is NOT reset by clearDiff
    expect(state.wrapEnabled).toBe(true)
  })

  it('loadDiff.pending sets loading and requestId', () => {
    const state = diffReducer(undefined, makeAction('diff/loadDiff/pending'))
    expect(state.loading).toBe(true)
    expect(state.error).toBeUndefined()
    expect(state.currentRequestId).toBe('req-1')
  })

  it('loadDiff.fulfilled updates state when requestId matches', () => {
    const pending: DiffState = {
      loading: true,
      wrapEnabled: false,
      original: '',
      modified: '',
      language: 'plaintext',
      isBinary: false,
      currentRequestId: 'req-1',
    }
    const state = diffReducer(
      pending,
      makeAction('diff/loadDiff/fulfilled', {
        original: 'old code',
        modified: 'new code',
        language: 'typescript',
        isBinary: false,
      }),
    )
    expect(state.loading).toBe(false)
    expect(state.original).toBe('old code')
    expect(state.modified).toBe('new code')
    expect(state.language).toBe('typescript')
  })

  it('loadDiff.fulfilled ignores mismatched requestId', () => {
    const pending: DiffState = {
      loading: true,
      wrapEnabled: false,
      original: '',
      modified: '',
      language: 'plaintext',
      isBinary: false,
      currentRequestId: 'req-1',
    }
    const state = diffReducer(
      pending,
      makeAction(
        'diff/loadDiff/fulfilled',
        { original: 'old', modified: 'new', language: 'typescript', isBinary: false },
        'req-2',
      ),
    )
    expect(state.loading).toBe(true)
    expect(state.original).toBe('')
  })

  it('loadDiff.rejected sets error when requestId matches', () => {
    const pending: DiffState = {
      loading: true,
      wrapEnabled: false,
      original: '',
      modified: '',
      language: 'plaintext',
      isBinary: false,
      currentRequestId: 'req-1',
    }
    const state = diffReducer(pending, {
      type: 'diff/loadDiff/rejected',
      payload: 'File not found',
      meta: { requestId: 'req-1', arg: {} },
      error: {},
    })
    expect(state.loading).toBe(false)
    expect(state.error).toBe('File not found')
  })

  it('loadDiff.rejected ignores mismatched requestId', () => {
    const pending: DiffState = {
      loading: true,
      wrapEnabled: false,
      original: '',
      modified: '',
      language: 'plaintext',
      isBinary: false,
      currentRequestId: 'req-1',
    }
    const state = diffReducer(pending, {
      type: 'diff/loadDiff/rejected',
      payload: 'err',
      meta: { requestId: 'req-2', arg: {} },
      error: {},
    })
    expect(state.loading).toBe(true)
    expect(state.error).toBeUndefined()
  })

  it('loadDiff.rejected uses fallback error message', () => {
    const pending: DiffState = {
      loading: true,
      wrapEnabled: false,
      original: '',
      modified: '',
      language: 'plaintext',
      isBinary: false,
      currentRequestId: 'req-1',
    }
    const state = diffReducer(pending, {
      type: 'diff/loadDiff/rejected',
      payload: undefined,
      meta: { requestId: 'req-1', arg: {} },
      error: {},
    })
    expect(state.error).toBe('Failed to load diff')
  })
})

describe('diff selectors', () => {
  const makeDiffState = (overrides?: Partial<DiffState>): RootState =>
    ({
      diff: {
        loading: false,
        wrapEnabled: false,
        original: '',
        modified: '',
        language: 'plaintext',
        isBinary: false,
        ...overrides,
      },
    }) as RootState

  it('selectDiffLoading', () => {
    expect(selectDiffLoading(makeDiffState({ loading: true }))).toBe(true)
  })

  it('selectDiffOriginal', () => {
    expect(selectDiffOriginal(makeDiffState({ original: 'code' }))).toBe('code')
  })

  it('selectDiffModified', () => {
    expect(selectDiffModified(makeDiffState({ modified: 'code' }))).toBe('code')
  })

  it('selectDiffLanguage', () => {
    expect(selectDiffLanguage(makeDiffState({ language: 'rust' }))).toBe('rust')
  })

  it('selectDiffIsBinary', () => {
    expect(selectDiffIsBinary(makeDiffState({ isBinary: true }))).toBe(true)
  })

  it('selectDiffError', () => {
    expect(selectDiffError(makeDiffState({ error: 'oops' }))).toBe('oops')
  })

  it('selectWrapEnabled', () => {
    expect(selectWrapEnabled(makeDiffState({ wrapEnabled: true }))).toBe(true)
  })
})
