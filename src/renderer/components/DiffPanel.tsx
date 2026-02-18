import { type ReactElement, useCallback, useState } from 'react'

import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useAppSelector } from '../hooks/use-app-selector'
import {
  loadDiff,
  selectDiffError,
  selectDiffIsBinary,
  selectDiffLastRequest,
  selectDiffLoading,
  selectWrapEnabled,
  toggleWrap,
} from '../store/diff-slice'
import { addToast } from '../store/ui-slice'

import styles from './DiffPanel.module.css'
import { DiffView } from './DiffView'
import { Placeholder } from './Placeholder'

type DiffPanelProps = {
  filePath: string
  sectionBadge?: string
  onClose?: () => void
}

export function DiffPanel({ filePath, sectionBadge, onClose }: DiffPanelProps): ReactElement {
  const dispatch = useAppDispatch()
  const wrapEnabled = useAppSelector(selectWrapEnabled)
  const loading = useAppSelector(selectDiffLoading)
  const error = useAppSelector(selectDiffError)
  const isBinary = useAppSelector(selectDiffIsBinary)
  const lastRequest = useAppSelector(selectDiffLastRequest)
  const [fetching, setFetching] = useState(false)

  const isRefNotFoundError = error !== undefined && error.includes('not found locally')
  const canRetry = isRefNotFoundError && lastRequest?.baseRef !== undefined

  const handleFetchOrigin = useCallback(() => {
    if (!lastRequest) return
    setFetching(true)
    void window.api.fetchOrigin().then((result) => {
      if (result.ok) {
        void dispatch(loadDiff(lastRequest))
      } else {
        dispatch(addToast({ variant: 'error', message: `Fetch failed: ${result.error}` }))
      }
      setFetching(false)
    })
  }, [dispatch, lastRequest])

  const renderContent = (): ReactElement => {
    if (loading || fetching) {
      return <Placeholder message={fetching ? 'Fetching from origin...' : 'Loading diff...'} />
    }
    if (error) {
      if (canRetry) {
        return (
          <Placeholder
            message={error}
            action={{ label: 'Fetch from origin', onClick: handleFetchOrigin }}
          />
        )
      }
      return <Placeholder message={error} />
    }
    if (isBinary) {
      return <Placeholder message="Binary file — cannot display diff" />
    }
    return <DiffView />
  }

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        {onClose && (
          <button
            className={styles.closeBtn}
            onClick={onClose}
            type="button"
            aria-label="Close file diff"
          >
            &larr;
          </button>
        )}
        <div className={styles.fileInfo}>
          <span className={styles.filePath} title={filePath}>{filePath}</span>
          {sectionBadge && <span className={styles.sectionBadge}>{sectionBadge}</span>}
        </div>
        <button
          className={`${styles.wrapBtn} ${wrapEnabled ? styles.wrapBtnActive : ''}`}
          onClick={() => { dispatch(toggleWrap()) }}
          type="button"
          title="Toggle word wrap"
        >
          Wrap
        </button>
      </div>
      {renderContent()}
    </div>
  )
}
