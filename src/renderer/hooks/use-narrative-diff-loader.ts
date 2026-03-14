import { useLayoutEffect, useRef } from 'react'

import type { FileChange } from '@shared/types'

import { useAppDispatch } from './use-app-dispatch'
import { useAppSelector } from './use-app-selector'
import { selectStaged, selectUnstaged } from '../store/changes-slice'
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
  const staged = useAppSelector(selectStaged)
  const unstaged = useAppSelector(selectUnstaged)

  // Use refs for values that shouldn't trigger re-runs
  const stagedRef = useRef<FileChange[]>(staged)
  const unstagedRef = useRef<FileChange[]>(unstaged)
  stagedRef.current = staged
  unstagedRef.current = unstaged

  // useLayoutEffect ensures loadDiff.pending is dispatched before paint,
  // preventing a flash of empty DiffView
  useLayoutEffect(() => {
    if (!selectedFile) {
      narrativeDebugLog('diff loader clear', { reason: 'no-selected-file' })
      dispatch(clearDiff())
      return
    }

    if (source === 'branch-diff' && prData) {
      // Branch diff: compare base branch vs HEAD
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
      // Uncommitted: compare HEAD vs worktree (combines staged + unstaged)
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
      // GitHub PR: try to compare base ref vs head ref locally
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
      return
    }

    // Fallback: try staged/unstaged lookup (original behavior)
    const stagedFile = stagedRef.current.find((f) => f.path === selectedFile)
    if (stagedFile) {
      narrativeDebugLog('diff loader request', {
        source: 'fallback-staged',
        path: selectedFile,
        origPath: stagedFile.origPath,
      })
      void dispatch(
        loadDiff({ path: selectedFile, section: 'staged', origPath: stagedFile.origPath }),
      )
      return
    }

    const unstagedFile = unstagedRef.current.find((f) => f.path === selectedFile)
    narrativeDebugLog('diff loader request', {
      source: 'fallback-unstaged',
      path: selectedFile,
      origPath: unstagedFile?.origPath,
    })
    void dispatch(
      loadDiff({
        path: selectedFile,
        section: 'unstaged',
        origPath: unstagedFile?.origPath,
      }),
    )
  }, [dispatch, selectedFile, source, prData])
}
