import type { ReactElement } from 'react'
import { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useAppSelector } from '../hooks/use-app-selector'
import { clearSelection, deleteFile, discardFile, refreshStatus } from '../store/changes-slice'
import { closeConfirmModal, selectConfirmModal } from '../store/ui-slice'

import styles from './ConfirmModal.module.css'

export function ConfirmModal(): ReactElement | null {
  const dispatch = useAppDispatch()
  const modal = useAppSelector(selectConfirmModal)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (modal.open) {
      confirmRef.current?.focus()
    }
  }, [modal.open])

  const handleCancel = useCallback(() => {
    dispatch(closeConfirmModal())
  }, [dispatch])

  const handleConfirm = useCallback(() => {
    if (!modal.onConfirmAction) return
    const { type, path } = modal.onConfirmAction

    if (type === 'discard') {
      void dispatch(discardFile(path)).then(() => dispatch(refreshStatus()))
    } else {
      void dispatch(deleteFile(path)).then(() => {
        dispatch(clearSelection())
        return dispatch(refreshStatus())
      })
    }

    dispatch(closeConfirmModal())
  }, [dispatch, modal.onConfirmAction])

  useEffect(() => {
    if (!modal.open) return

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        handleCancel()
      } else if (e.key === 'Enter') {
        handleConfirm()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [modal.open, handleCancel, handleConfirm])

  if (!modal.open) return null

  return createPortal(
    <div className={styles['backdrop']} onClick={handleCancel}>
      <div
        className={styles['modal']}
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <div className={styles['title']}>{modal.title}</div>
        <div className={styles['message']}>{modal.message}</div>
        <div className={styles['actions']}>
          <button className={styles['cancelButton']} onClick={handleCancel} type="button">
            Cancel
          </button>
          <button
            className={styles['confirmButton']}
            onClick={handleConfirm}
            ref={confirmRef}
            type="button"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
