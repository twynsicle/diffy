import { useEffect } from 'react'

import { fetchBranch, openRepo } from '../store/repo-slice'

import { useAppDispatch } from './use-app-dispatch'

export function useRestoreLastRepo(): void {
  const dispatch = useAppDispatch()

  useEffect(() => {
    void (async () => {
      const lastPath = await window.api.getLastRepo()
      if (lastPath) {
        const result = await dispatch(openRepo(lastPath))
        if (openRepo.fulfilled.match(result)) {
          void dispatch(fetchBranch())
        }
      }
    })()
  }, [dispatch])
}
