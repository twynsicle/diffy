import type { ReactElement } from 'react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useAppSelector } from '../hooks/use-app-selector'
import { dismissToast, selectToasts } from '../store/ui-slice'
import type { Toast } from '../store/ui-slice'

import styles from './ToastContainer.module.css'

const AUTO_DISMISS_MS = 5000

function ToastItem({ toast }: { toast: Toast }): ReactElement {
  const dispatch = useAppDispatch()

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(dismissToast(toast.id))
    }, AUTO_DISMISS_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [dispatch, toast.id])

  const variantClass = toast.variant === 'error' ? styles['error'] : styles['info']

  return (
    <div className={`${styles['toast']} ${variantClass}`} role="alert">
      <span className={styles['message']}>{toast.message}</span>
      <button
        className={styles['dismiss']}
        onClick={() => {
          dispatch(dismissToast(toast.id))
        }}
        type="button"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}

export function ToastContainer(): ReactElement | null {
  const toasts = useAppSelector(selectToasts)

  if (toasts.length === 0) return null

  return createPortal(
    <div className={styles['container']}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body,
  )
}
