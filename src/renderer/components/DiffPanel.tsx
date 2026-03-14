import { type ReactElement, useCallback } from 'react'

import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useAppSelector } from '../hooks/use-app-selector'
import {
  fetchOrigin,
  loadDiff,
  selectDiffError,
  selectDiffFetching,
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
  const fetching = useAppSelector(selectDiffFetching)
  const error = useAppSelector(selectDiffError)
  const isBinary = useAppSelector(selectDiffIsBinary)
  const lastRequest = useAppSelector(selectDiffLastRequest)

  const isRefNotFoundError = error !== undefined && error.includes('not found locally')
  const canRetry = isRefNotFoundError && lastRequest?.baseRef !== undefined

  const handleFetchOrigin = useCallback(() => {
    if (!lastRequest) return
    void dispatch(fetchOrigin()).then((action) => {
      if (fetchOrigin.fulfilled.match(action)) {
        void dispatch(loadDiff(lastRequest))
      } else if (fetchOrigin.rejected.match(action)) {
        const message = action.payload ?? 'Fetch failed'
        dispatch(addToast({ variant: 'error', message: `Fetch failed: ${message}` }))
      }
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
        <div className={styles.fileInfo}>
          <span className={styles.filePath} title={filePath}>
            {filePath}
          </span>
          {sectionBadge && <span className={styles.sectionBadge}>{sectionBadge}</span>}
        </div>
        <button
          className={`${styles.wrapBtn} ${wrapEnabled ? styles.wrapBtnActive : ''}`}
          onClick={() => {
            dispatch(toggleWrap())
          }}
          type="button"
          title="Toggle word wrap"
        >
          Wrap
        </button>
        {onClose && (
          <button
            className={styles.closeBtn}
            onClick={onClose}
            type="button"
            aria-label="Close file diff"
          >
            &times;
          </button>
        )}
      </div>
      {renderContent()}
    </div>
  )
}
