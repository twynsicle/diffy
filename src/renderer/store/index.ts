import { configureStore } from '@reduxjs/toolkit'

import { diffReducer } from './diff-slice'
import { errorToastMiddleware } from './error-toast-middleware'
import { narrativeReducer } from './narrative-slice'
import { repoReducer } from './repo-slice'
import { settingsReducer } from './settings-slice'
import { uiReducer } from './ui-slice'

export const store = configureStore({
  reducer: {
    repo: repoReducer,
    diff: diffReducer,
    ui: uiReducer,
    narrative: narrativeReducer,
    settings: settingsReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(errorToastMiddleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
