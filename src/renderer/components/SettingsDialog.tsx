import type { ReactElement } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useAppSelector } from '../hooks/use-app-selector'
import { addToast, closeSettings, selectSettingsOpen } from '../store/ui-slice'

import styles from './SettingsDialog.module.css'

export function SettingsDialog(): ReactElement | null {
  const dispatch = useAppDispatch()
  const isOpen = useAppSelector(selectSettingsOpen)
  const inputRef = useRef<HTMLInputElement>(null)

  const [apiKey, setApiKey] = useState('')
  const [hasKey, setHasKey] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    setLoading(true)
    void (async () => {
      const hasResult = await window.api.hasApiKey()
      if (hasResult.ok && hasResult.data) {
        setHasKey(true)
        const getResult = await window.api.getApiKey()
        if (getResult.ok) {
          setApiKey(getResult.data)
        }
      } else {
        setHasKey(false)
        setApiKey('')
      }
      setLoading(false)
      setTimeout(() => { inputRef.current?.focus() }, 0)
    })()
  }, [isOpen])

  const handleClose = useCallback(() => {
    setApiKey('')
    setHasKey(false)
    dispatch(closeSettings())
  }, [dispatch])

  const handleSave = useCallback(async () => {
    if (!apiKey.trim()) return
    setLoading(true)
    const result = await window.api.setApiKey(apiKey.trim())
    setLoading(false)
    if (result.ok) {
      dispatch(addToast({ message: 'API key saved', variant: 'info' }))
      handleClose()
    } else {
      dispatch(addToast({ message: result.error, variant: 'error' }))
    }
  }, [apiKey, dispatch, handleClose])

  const handleClear = useCallback(async () => {
    setLoading(true)
    const result = await window.api.clearApiKey()
    setLoading(false)
    if (result.ok) {
      setApiKey('')
      setHasKey(false)
      dispatch(addToast({ message: 'API key cleared', variant: 'info' }))
    } else {
      dispatch(addToast({ message: result.error, variant: 'error' }))
    }
  }, [dispatch])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        handleClose()
      } else if (e.key === 'Enter') {
        void handleSave()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => { document.removeEventListener('keydown', handleKeyDown) }
  }, [isOpen, handleClose, handleSave])

  if (!isOpen) return null

  return createPortal(
    <div className={styles['backdrop']} onClick={handleClose}>
      <div className={styles['modal']} onClick={(e) => { e.stopPropagation() }}>
        <div className={styles['title']}>Settings</div>
        <div className={styles['field']}>
          <label className={styles['label']} htmlFor="api-key-input">
            Anthropic API Key
          </label>
          <input
            className={styles['input']}
            disabled={loading}
            id="api-key-input"
            onChange={(e) => { setApiKey(e.target.value) }}
            placeholder="sk-ant-..."
            ref={inputRef}
            type="password"
            value={apiKey}
          />
          <div className={styles['hint']}>
            {hasKey
              ? 'Key is stored securely. Enter a new key to replace it.'
              : 'Your key is encrypted and stored locally.'}
          </div>
        </div>
        <div className={styles['actions']}>
          {hasKey && (
            <button
              className={styles['clearButton']}
              disabled={loading}
              onClick={() => { void handleClear() }}
              type="button"
            >
              Clear Key
            </button>
          )}
          <button
            className={styles['cancelButton']}
            disabled={loading}
            onClick={handleClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className={styles['saveButton']}
            disabled={loading || !apiKey.trim()}
            onClick={() => { void handleSave() }}
            type="button"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
