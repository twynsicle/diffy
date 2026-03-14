import { type ReactElement, useCallback, useState } from 'react'

import { useAppDispatch } from '../../hooks/use-app-dispatch'
import { useAppSelector } from '../../hooks/use-app-selector'
import { commitChanges, refreshStatus, selectStaged } from '../../store/changes-slice'
import { fetchBranch } from '../../store/repo-slice'
import { addToast } from '../../store/ui-slice'

import styles from './CommitPanel.module.css'

const MAX_LENGTH = 90

export function CommitPanel(): ReactElement {
  const dispatch = useAppDispatch()
  const staged = useAppSelector(selectStaged)
  const [message, setMessage] = useState('')
  const [committing, setCommitting] = useState(false)

  const remaining = MAX_LENGTH - message.length
  const hasMessage = message.trim().length > 0
  const hasStagedFiles = staged.length > 0
  const canCommit = hasMessage && hasStagedFiles && !committing

  const buttonText = !hasMessage
    ? 'Type a Message to Commit'
    : !hasStagedFiles
      ? 'No Staged Changes'
      : `Commit Changes to ${String(staged.length)} File${staged.length === 1 ? '' : 's'}`

  const handleCommit = useCallback(() => {
    if (!canCommit) return
    setCommitting(true)
    void dispatch(commitChanges(message.trim())).then((action) => {
      setCommitting(false)
      if (commitChanges.fulfilled.match(action)) {
        setMessage('')
        dispatch(addToast({ variant: 'info', message: 'Changes committed' }))
        void dispatch(refreshStatus())
        void dispatch(fetchBranch())
      }
    })
  }, [dispatch, message, canCommit])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && canCommit) {
        e.preventDefault()
        handleCommit()
      }
    },
    [canCommit, handleCommit],
  )

  return (
    <div className={styles.panel}>
      <div className={styles.inputWrapper}>
        <input
          className={styles.input}
          type="text"
          placeholder="Commit message"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value)
          }}
          onKeyDown={handleKeyDown}
          disabled={committing}
        />
        <span className={`${styles.counter} ${remaining < 0 ? styles.counterOver : ''}`}>
          {remaining}
        </span>
      </div>
      <button
        className={styles.commitBtn}
        type="button"
        disabled={!canCommit}
        onClick={handleCommit}
      >
        {buttonText}
      </button>
    </div>
  )
}
