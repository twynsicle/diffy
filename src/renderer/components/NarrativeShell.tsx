import { type ReactElement, useEffect } from 'react'

import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useAppSelector } from '../hooks/use-app-selector'
import {
  checkGhInstalled,
  selectGhInstalled,
  selectPrData,
  selectPrError,
} from '../store/narrative-slice'

import styles from './NarrativeShell.module.css'
import { PrInput } from './PrInput'
import { PrSummary } from './PrSummary'

export function NarrativeShell(): ReactElement {
  const dispatch = useAppDispatch()
  const ghInstalled = useAppSelector(selectGhInstalled)
  const prData = useAppSelector(selectPrData)
  const prError = useAppSelector(selectPrError)

  useEffect(() => {
    if (ghInstalled === null) {
      void dispatch(checkGhInstalled())
    }
  }, [dispatch, ghInstalled])

  return (
    <div className={styles.shell}>
      {ghInstalled === false && (
        <div className={styles.warning}>
          GitHub CLI (gh) not found. Install it from{' '}
          <code>https://cli.github.com</code> and run <code>gh auth login</code>.
        </div>
      )}
      <PrInput />
      {prError && <div className={styles.error}>{prError}</div>}
      {prData && <PrSummary data={prData} />}
    </div>
  )
}
