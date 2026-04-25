import { useCallback } from 'react'

import { fetchBranch, openRepo } from '../store/repo-slice'

import { useAppDispatch } from './use-app-dispatch'

type RepoActions = {
  openAndRefresh: () => Promise<void>
}

export function useRepoActions(): RepoActions {
  const dispatch = useAppDispatch()

  const openAndRefresh = useCallback(async (): Promise<void> => {
    const folderPath = await window.api.selectFolder()
    if (folderPath) {
      const result = await dispatch(openRepo(folderPath))
      if (openRepo.fulfilled.match(result)) {
        void dispatch(fetchBranch())
      }
    }
  }, [dispatch])

  return { openAndRefresh }
}
