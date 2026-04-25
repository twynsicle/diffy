import { useLayoutEffect } from 'react'

import { useAppDispatch } from './use-app-dispatch'
import { useAppSelector } from './use-app-selector'
import { clearDiff, loadDiff } from '../store/diff-slice'
import {
  selectNarrativeSource,
  selectPrData,
  selectSelectedNarrativeFile,
} from '../store/narrative-slice'
import { narrativeDebugLog } from '../utils/narrative-debug'

export function useNarrativeDiffLoader(): void {
  const dispatch = useAppDispatch()
  const selectedFile = useAppSelector(selectSelectedNarrativeFile)
  const source = useAppSelector(selectNarrativeSource)
  const prData = useAppSelector(selectPrData)

  // useLayoutEffect ensures loadDiff.pending is dispatched before paint,
  // preventing a flash of empty DiffView
  useLayoutEffect(() => {
    if (!selectedFile) {
      narrativeDebugLog('diff loader clear', { reason: 'no-selected-file' })
      dispatch(clearDiff())
      return
    }

    if (source === 'branch-diff' && prData) {
      narrativeDebugLog('diff loader request', {
        source,
        path: selectedFile,
        baseRef: prData.baseRefName,
        headRef: 'HEAD',
      })
      void dispatch(
        loadDiff({
          path: selectedFile,
          section: 'unstaged',
          baseRef: prData.baseRefName,
          headRef: 'HEAD',
        }),
      )
      return
    }

    if (source === 'uncommitted') {
      narrativeDebugLog('diff loader request', {
        source,
        path: selectedFile,
        baseRef: 'HEAD',
        headRef: 'WORKTREE',
      })
      void dispatch(
        loadDiff({
          path: selectedFile,
          section: 'unstaged',
          baseRef: 'HEAD',
          headRef: 'WORKTREE',
        }),
      )
      return
    }

    if (source === 'github-pr' && prData) {
      narrativeDebugLog('diff loader request', {
        source,
        path: selectedFile,
        baseRef: `origin/${prData.baseRefName}`,
        headRef: `origin/${prData.headRefName}`,
      })
      void dispatch(
        loadDiff({
          path: selectedFile,
          section: 'unstaged',
          baseRef: `origin/${prData.baseRefName}`,
          headRef: `origin/${prData.headRefName}`,
        }),
      )
    }
  }, [dispatch, selectedFile, source, prData])
}
