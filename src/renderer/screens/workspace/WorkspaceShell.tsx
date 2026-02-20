import type { ReactElement } from 'react'

import { DiffPanel } from '../../components/DiffPanel'
import { Placeholder } from '../../components/Placeholder'
import { useAppSelector } from '../../hooks/use-app-selector'
import { useDiffLoader } from '../../hooks/use-diff-loader'
import { selectSelected } from '../../store/changes-slice'
import { selectRepoError, selectRepoRoot } from '../../store/repo-slice'

import { SidePane } from './SidePane'

function MainContent(): ReactElement {
  const repoRoot = useAppSelector(selectRepoRoot)
  const repoError = useAppSelector(selectRepoError)
  const selected = useAppSelector(selectSelected)

  if (!repoRoot) {
    return (
      <Placeholder
        message={repoError ?? 'Open a repository to get started'}
        hint={repoError ? undefined : 'Click "Open" in the title bar'}
      />
    )
  }

  if (!selected) {
    return <Placeholder message="Select a file to view its diff" />
  }

  const sectionLabel = selected.section === 'staged' ? 'Staged' : 'Unstaged'

  return <DiffPanel filePath={selected.path} sectionBadge={sectionLabel} />
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
