import { describe, expect, it, vi } from 'vitest'

import { errorToastMiddleware } from './error-toast-middleware'

function setup() {
  const dispatched: unknown[] = []
  const storeApi = {
    dispatch: (action: unknown) => {
      dispatched.push(action)
    },
    getState: () => ({}),
  }
  const next = vi.fn((action: unknown) => action)
  const invoke = errorToastMiddleware(storeApi)(next)
  return { invoke, next, dispatched }
}

describe('errorToastMiddleware', () => {
  it('passes all actions through next', () => {
    const { invoke, next } = setup()
    const action = { type: 'some/action' }
    invoke(action)
    expect(next).toHaveBeenCalledWith(action)
  })

  it('returns the result of next', () => {
    const { invoke, next } = setup()
    const action = { type: 'some/action' }
    next.mockReturnValue('result')
    expect(invoke(action)).toBe('result')
  })

  it('dispatches addToast for /rejected with string payload', () => {
    const { invoke, dispatched } = setup()
    invoke({ type: 'changes/refreshStatus/rejected', payload: 'Git error' })
    expect(dispatched).toHaveLength(1)
    const toast = dispatched[0] as { payload: { message: string; variant: string } }
    expect(toast.payload.message).toBe('Git error')
    expect(toast.payload.variant).toBe('error')
  })

  it('does NOT dispatch for /rejected with non-string payload', () => {
    const { invoke, dispatched } = setup()
    invoke({ type: 'changes/refreshStatus/rejected', payload: { code: 500 } })
    expect(dispatched).toHaveLength(0)
  })

  it('does NOT dispatch for /rejected with undefined payload', () => {
    const { invoke, dispatched } = setup()
    invoke({ type: 'changes/refreshStatus/rejected', payload: undefined })
    expect(dispatched).toHaveLength(0)
  })

  it('does NOT dispatch for non-rejected actions', () => {
    const { invoke, dispatched } = setup()
    invoke({ type: 'changes/refreshStatus/pending' })
    invoke({ type: 'changes/refreshStatus/fulfilled', payload: {} })
    invoke({ type: 'ui/addToast', payload: { message: 'hi', variant: 'info' } })
    expect(dispatched).toHaveLength(0)
  })
})
