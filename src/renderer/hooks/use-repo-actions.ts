import { useCallback } from 'react'

import { refreshStatus, stageAll, stageFile, unstageAll, unstageFile } from '../store/changes-slice'
import { fetchBranch, openRepo } from '../store/repo-slice'

import { useAppDispatch } from './use-app-dispatch'

type RepoActions = {
  openAndRefresh: () => Promise<void>
  stageAndRefresh: (path: string) => void
  unstageAndRefresh: (path: string) => void
  stageAllAndRefresh: () => void
  unstageAllAndRefresh: () => void
}

export function useRepoActions(): RepoActions {
  const dispatch = useAppDispatch()

  const openAndRefresh = useCallback(async (): Promise<void> => {
    const folderPath = await window.api.selectFolder()
    if (folderPath) {
      const result = await dispatch(openRepo(folderPath))
      if (openRepo.fulfilled.match(result)) {
        void dispatch(refreshStatus())
        void dispatch(fetchBranch())
      }
    }
  }, [dispatch])

  const stageAndRefresh = useCallback(
    (path: string) => {
      void dispatch(stageFile(path)).then(() => dispatch(refreshStatus()))
    },
    [dispatch],
  )

  const unstageAndRefresh = useCallback(
    (path: string) => {
      void dispatch(unstageFile(path)).then(() => dispatch(refreshStatus()))
    },
    [dispatch],
  )

  const stageAllAndRefresh = useCallback(() => {
    void dispatch(stageAll()).then(() => dispatch(refreshStatus()))
  }, [dispatch])

  const unstageAllAndRefresh = useCallback(() => {
    void dispatch(unstageAll()).then(() => dispatch(refreshStatus()))
  }, [dispatch])

  return {
    openAndRefresh,
    stageAndRefresh,
    unstageAndRefresh,
    stageAllAndRefresh,
    unstageAllAndRefresh,
  }
}
