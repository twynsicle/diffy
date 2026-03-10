import { type ReactElement, useCallback } from 'react'

import { DiffPanel } from '../../components/DiffPanel'
import { Placeholder } from '../../components/Placeholder'
import { useAppDispatch } from '../../hooks/use-app-dispatch'
import { useAppSelector } from '../../hooks/use-app-selector'
import { useDiffLoader } from '../../hooks/use-diff-loader'
import { clearSelection, selectSelected } from '../../store/changes-slice'
import { selectRepoError, selectRepoRoot } from '../../store/repo-slice'

import { BranchToolbar } from './BranchToolbar'
import { SidePane } from './SidePane'

function MainContent(): ReactElement {
  const dispatch = useAppDispatch()
  const repoRoot = useAppSelector(selectRepoRoot)
  const repoError = useAppSelector(selectRepoError)
  const selected = useAppSelector(selectSelected)

  const handleClose = useCallback(() => {
    dispatch(clearSelection())
  }, [dispatch])

  if (!repoRoot) {
    return (
      <Placeholder
        message={repoError ?? 'Open a repository to get started'}
        hint={repoError ? undefined : 'Click "Open" in the title bar'}
      />
    )
  }

  if (!selected) {
    return <BranchToolbar />
  }

  const sectionLabel = selected.section === 'staged' ? 'Staged' : 'Unstaged'

  return <DiffPanel filePath={selected.path} sectionBadge={sectionLabel} onClose={handleClose} />
}

export function WorkspaceShell(): ReactElement {
  const repoRoot = useAppSelector(selectRepoRoot)
  useDiffLoader()

  return (
    <>
      <MainContent />
      {repoRoot && <SidePane />}
    </>
  )
}
