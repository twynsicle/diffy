import { useEffect } from 'react'

import { useAppDispatch } from './use-app-dispatch'
import { useAppSelector } from './use-app-selector'
import { refreshStatus } from '../store/changes-slice'
import { openRepo } from '../store/repo-slice'
import { selectRepoRoot } from '../store/repo-slice'
import { openSettings } from '../store/ui-slice'

export function useKeyboardShortcuts(): void {
  const dispatch = useAppDispatch()
  const repoRoot = useAppSelector(selectRepoRoot)

  useEffect(() => {
    const unsubOpen = window.api.onShortcutOpenRepo(() => {
      void (async () => {
        const folderPath = await window.api.selectFolder()
        if (folderPath) {
          const result = await dispatch(openRepo(folderPath))
          if (openRepo.fulfilled.match(result)) {
            void dispatch(refreshStatus())
          }
        }
      })()
    })

    return unsubOpen
  }, [dispatch])

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
