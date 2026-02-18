import { useEffect } from 'react'

import { useAppDispatch } from './use-app-dispatch'
import { useAppSelector } from './use-app-selector'
import { useRepoActions } from './use-repo-actions'
import { refreshStatus } from '../store/changes-slice'
import { selectRepoRoot } from '../store/repo-slice'
import { openSettings } from '../store/ui-slice'

export function useKeyboardShortcuts(): void {
  const dispatch = useAppDispatch()
  const repoRoot = useAppSelector(selectRepoRoot)
  const { openAndRefresh } = useRepoActions()

  useEffect(() => {
    const unsubOpen = window.api.onShortcutOpenRepo(() => {
      void openAndRefresh()
    })

    return unsubOpen
  }, [openAndRefresh])

  useEffect(() => {
    const unsubRefresh = window.api.onShortcutRefresh(() => {
      if (repoRoot) {
        void dispatch(refreshStatus())
      }
    })

    return unsubRefresh
  }, [dispatch, repoRoot])

  useEffect(() => {
    const unsubSettings = window.api.onShortcutOpenSettings(() => {
      dispatch(openSettings())
    })

    return unsubSettings
  }, [dispatch])
}
