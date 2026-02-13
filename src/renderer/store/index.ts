import { configureStore } from '@reduxjs/toolkit'

import { changesReducer } from './changes-slice'
import { diffReducer } from './diff-slice'
import { repoReducer } from './repo-slice'

export const store = configureStore({
  reducer: {
    repo: repoReducer,
    changes: changesReducer,
    diff: diffReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
