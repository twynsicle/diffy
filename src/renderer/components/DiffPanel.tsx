import type { ReactElement } from 'react'

import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useAppSelector } from '../hooks/use-app-selector'
import {
  selectDiffError,
  selectDiffIsBinary,
  selectDiffLoading,
  selectWrapEnabled,
  toggleWrap,
} from '../store/diff-slice'

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
      {loading && <Placeholder message="Loading diff..." />}
      {!loading && error && <Placeholder message={error} />}
      {!loading && !error && isBinary && <Placeholder message="Binary file — cannot display diff" />}
      {!loading && !error && !isBinary && <DiffView />}
    </div>
  )
}
