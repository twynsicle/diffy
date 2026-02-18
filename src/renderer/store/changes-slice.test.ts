import { describe, expect, it } from 'vitest'

import type { FileChange } from '@shared/types'

import type { RootState } from '.'

import {
  changesReducer,
  clearSelection,
  selectFile,
  selectRefreshing,
  selectSelected,
  selectStaged,
  selectUnstaged,
} from './changes-slice'

type ChangesState = ReturnType<typeof changesReducer>

function makeFileChange(path: string, section: 'staged' | 'unstaged' = 'unstaged'): FileChange {
  return {
    path,
    displayPath: path,
    X: section === 'staged' ? 'M' : ' ',
    Y: section === 'unstaged' ? 'M' : ' ',
    isUntracked: false,
    isRenamed: false,
    isDeleted: false,
    section,
  }
}

describe('changesReducer', () => {
  it('has correct initial state', () => {
    const state = changesReducer(undefined, { type: '@@INIT' })
    expect(state.staged).toEqual([])
    expect(state.unstaged).toEqual([])
    expect(state.selected).toBeUndefined()
    expect(state.refreshing).toBe(false)
  })

  it('selectFile sets the selection', () => {
    const selection = { path: 'src/main.ts', section: 'unstaged' as const }
    const state = changesReducer(undefined, selectFile(selection))
    expect(state.selected).toEqual(selection)
  })

  it('clearSelection clears the selection', () => {
    const state1 = changesReducer(undefined, selectFile({ path: 'a.ts', section: 'staged' }))
    const state2 = changesReducer(state1, clearSelection())
    expect(state2.selected).toBeUndefined()
  })

  it('refreshStatus.pending sets refreshing', () => {
    const state = changesReducer(undefined, { type: 'changes/refreshStatus/pending' })
    expect(state.refreshing).toBe(true)
  })

  it('refreshStatus.rejected clears refreshing', () => {
    const pending: ChangesState = {
      staged: [],
      unstaged: [],
      statusUpdatedAt: 0,
      refreshing: true,
    }
    const state = changesReducer(pending, { type: 'changes/refreshStatus/rejected' })
    expect(state.refreshing).toBe(false)
  })

  it('refreshStatus.fulfilled updates staged and unstaged', () => {
    const staged = [makeFileChange('a.ts', 'staged')]
    const unstaged = [makeFileChange('b.ts', 'unstaged')]
    const state = changesReducer(undefined, {
      type: 'changes/refreshStatus/fulfilled',
      payload: { staged, unstaged },
    })
    expect(state.staged).toEqual(staged)
    expect(state.unstaged).toEqual(unstaged)
    expect(state.refreshing).toBe(false)
  })

  it('selection persistence: keeps selection when file still in section', () => {
    const file = makeFileChange('a.ts', 'unstaged')
    const before: ChangesState = {
      staged: [],
      unstaged: [file],
      selected: { path: 'a.ts', section: 'unstaged' },
      statusUpdatedAt: 0,
      refreshing: true,
    }
    const state = changesReducer(before, {
      type: 'changes/refreshStatus/fulfilled',
      payload: { staged: [], unstaged: [file] },
    })
    expect(state.selected?.path).toBe('a.ts')
  })

  it('selection persistence: auto-advances when file removed but others remain', () => {
    const before: ChangesState = {
      staged: [],
      unstaged: [makeFileChange('a.ts'), makeFileChange('b.ts'), makeFileChange('c.ts')],
      selected: { path: 'b.ts', section: 'unstaged' },
      statusUpdatedAt: 0,
      refreshing: true,
    }
    const state = changesReducer(before, {
      type: 'changes/refreshStatus/fulfilled',
      payload: { staged: [], unstaged: [makeFileChange('a.ts'), makeFileChange('c.ts')] },
    })
    // b.ts was at index 1, remaining has 2 items, so nextIndex = min(1, 1) = 1 → c.ts
    expect(state.selected?.path).toBe('c.ts')
  })

  it('selection persistence: clears when section is empty', () => {
    const before: ChangesState = {
      staged: [],
      unstaged: [makeFileChange('a.ts')],
      selected: { path: 'a.ts', section: 'unstaged' },
      statusUpdatedAt: 0,
      refreshing: true,
    }
    const state = changesReducer(before, {
      type: 'changes/refreshStatus/fulfilled',
      payload: { staged: [], unstaged: [] },
    })
    expect(state.selected).toBeUndefined()
  })

  it('selection persistence: clamps when oldIndex exceeds remaining length', () => {
    const before: ChangesState = {
      staged: [],
      unstaged: [makeFileChange('a.ts'), makeFileChange('b.ts'), makeFileChange('c.ts')],
      selected: { path: 'c.ts', section: 'unstaged' },
      statusUpdatedAt: 0,
      refreshing: true,
    }
    const state = changesReducer(before, {
      type: 'changes/refreshStatus/fulfilled',
      payload: { staged: [], unstaged: [makeFileChange('a.ts')] },
    })
    // c.ts was at index 2, remaining has 1 item, so nextIndex = min(2, 0) = 0 → a.ts
    expect(state.selected?.path).toBe('a.ts')
  })

  it('stageAll.fulfilled clears selection', () => {
    const before: ChangesState = {
      staged: [],
      unstaged: [makeFileChange('a.ts')],
      selected: { path: 'a.ts', section: 'unstaged' },
      statusUpdatedAt: 0,
      refreshing: false,
    }
    const state = changesReducer(before, { type: 'changes/stageAll/fulfilled' })
    expect(state.selected).toBeUndefined()
  })

  it('unstageAll.fulfilled clears selection', () => {
    const before: ChangesState = {
      staged: [makeFileChange('a.ts', 'staged')],
      unstaged: [],
      selected: { path: 'a.ts', section: 'staged' },
      statusUpdatedAt: 0,
      refreshing: false,
    }
    const state = changesReducer(before, { type: 'changes/unstageAll/fulfilled' })
    expect(state.selected).toBeUndefined()
  })
})

describe('changes selectors', () => {
  const makeState = (overrides?: Partial<ChangesState>): RootState =>
    ({
      changes: {
        staged: [],
        unstaged: [],
        statusUpdatedAt: 0,
        refreshing: false,
        ...overrides,
      },
    }) as RootState

  it('selectStaged returns staged files', () => {
    const staged = [makeFileChange('a.ts', 'staged')]
    expect(selectStaged(makeState({ staged }))).toEqual(staged)
  })

  it('selectUnstaged returns unstaged files', () => {
    const unstaged = [makeFileChange('b.ts')]
    expect(selectUnstaged(makeState({ unstaged }))).toEqual(unstaged)
  })

  it('selectSelected returns the selection', () => {
    const selected = { path: 'a.ts', section: 'staged' as const }
    expect(selectSelected(makeState({ selected }))).toEqual(selected)
  })

  it('selectRefreshing returns refreshing flag', () => {
    expect(selectRefreshing(makeState({ refreshing: true }))).toBe(true)
  })
})
