import { configureStore } from '@reduxjs/toolkit'

import { changesReducer } from './changes-slice'
import { diffReducer } from './diff-slice'
import { errorToastMiddleware } from './error-toast-middleware'
import { modeReducer } from './mode-slice'
import { repoReducer } from './repo-slice'
import { uiReducer } from './ui-slice'

export const store = configureStore({
  reducer: {
    repo: repoReducer,
    changes: changesReducer,
    diff: diffReducer,
    ui: uiReducer,
    mode: modeReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(errorToastMiddleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
