import type { Middleware } from '@reduxjs/toolkit'

import { addToast } from './ui-slice'

export const errorToastMiddleware: Middleware = (storeApi) => (next) => (action) => {
  const result = next(action)
  const act = action as {
    type?: string
    payload?: unknown
    meta?: { arg?: { background?: boolean } }
  }
  if (
    typeof act.type === 'string' &&
    act.type.endsWith('/rejected') &&
    typeof act.payload === 'string' &&
    act.meta?.arg?.background !== true
  ) {
    storeApi.dispatch(addToast({ message: act.payload, variant: 'error' }))
  }
  return result
}
