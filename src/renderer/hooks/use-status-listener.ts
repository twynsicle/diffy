import { useEffect } from 'react'

import { refreshStatus } from '../store/changes-slice'
import { fetchBranch } from '../store/repo-slice'

import { useAppDispatch } from './use-app-dispatch'

export function useStatusListener(): void {
  const dispatch = useAppDispatch()

  useEffect(() => {
    return window.api.onStatusChanged(() => {
      void dispatch(refreshStatus({ background: true }))
      void dispatch(fetchBranch())
    })
  }, [dispatch])
}
