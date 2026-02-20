import { type ReactElement, useEffect } from 'react'

import { useAppDispatch } from '../../hooks/use-app-dispatch'
import { useAppSelector } from '../../hooks/use-app-selector'
import {
  checkGhInstalled,
  fetchBranchDiff,
  fetchUncommittedDiff,
  selectGhInstalled,
  setSource,
} from '../../store/narrative-slice'
import { selectRepoRoot } from '../../store/repo-slice'

import styles from './SourceSelect.module.css'

export function SourceSelect(): ReactElement {
  const dispatch = useAppDispatch()
  const ghInstalled = useAppSelector(selectGhInstalled)
  const repoRoot = useAppSelector(selectRepoRoot)

  useEffect(() => {
    if (ghInstalled === null) {
      void dispatch(checkGhInstalled())
    }
  }, [dispatch, ghInstalled])

  const handleGithubPr = (): void => {
    dispatch(setSource('github-pr'))
  }

  const handleBranchDiff = (): void => {
    if (!repoRoot) return
    dispatch(setSource('branch-diff'))
    void dispatch(fetchBranchDiff())
  }

  const handleUncommitted = (): void => {
    if (!repoRoot) return
    dispatch(setSource('uncommitted'))
    void dispatch(fetchUncommittedDiff())
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Narrative Review</h2>
      <p className={styles.description}>Choose a source to review</p>
      <div className={styles.cards}>
        <button
          className={`${styles.card} ${ghInstalled === false ? styles.cardDisabled : ''}`}
          onClick={handleGithubPr}
          disabled={ghInstalled === false}
          type="button"
        >
          <span className={styles.cardTitle}>GitHub PR</span>
          <span className={styles.cardDesc}>Review a pull request from GitHub</span>
        </button>
        <button
          className={`${styles.card} ${!repoRoot ? styles.cardDisabled : ''}`}
          onClick={handleBranchDiff}
          disabled={!repoRoot}
          type="button"
        >
          <span className={styles.cardTitle}>Branch vs Main</span>
          <span className={styles.cardDesc}>Compare current branch against the default branch</span>
        </button>
        <button
          className={`${styles.card} ${!repoRoot ? styles.cardDisabled : ''}`}
          onClick={handleUncommitted}
          disabled={!repoRoot}
          type="button"
        >
          <span className={styles.cardTitle}>Uncommitted Changes</span>
          <span className={styles.cardDesc}>Review all uncommitted changes</span>
        </button>
      </div>
    </div>
  )
}
