import type { ReactElement } from 'react'

import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useAppSelector } from '../hooks/use-app-selector'
import { selectSelected } from '../store/changes-slice'
import { selectWrapEnabled, toggleWrap } from '../store/diff-slice'

import styles from './DiffToolbar.module.css'

export function DiffToolbar(): ReactElement {
  const dispatch = useAppDispatch()
  const wrapEnabled = useAppSelector(selectWrapEnabled)
  const selected = useAppSelector(selectSelected)

  const sectionLabel = selected?.section === 'staged' ? 'Staged' : 'Unstaged'

  return (
    <div className={styles.toolbar}>
      {selected && (
        <div className={styles.fileInfo}>
          <span className={styles.filePath} title={selected.path}>{selected.path}</span>
          <span className={styles.sectionBadge}>{sectionLabel}</span>
        </div>
      )}
      <button
        className={`${styles.button} ${wrapEnabled ? styles.active : ''}`}
        onClick={() => { dispatch(toggleWrap()) }}
        type="button"
        title="Toggle word wrap"
      >
        Wrap
      </button>
    </div>
  )
}
