import { useEffect } from 'react'

import { useAppDispatch } from './use-app-dispatch'
import { refreshStatus } from '../store/changes-slice'
import { openRepo } from '../store/repo-slice'

export function useRestoreLastRepo(): void {
  const dispatch = useAppDispatch()

  useEffect(() => {
    void (async () => {
      const lastPath = await window.api.getLastRepo()
      if (lastPath) {
        const result = await dispatch(openRepo(lastPath))
        if (openRepo.fulfilled.match(result)) {
          void dispatch(refreshStatus())
        }
      }
    })()
  }, [dispatch])
}
