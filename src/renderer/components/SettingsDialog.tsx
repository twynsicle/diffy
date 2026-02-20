import type { ReactElement } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import type { AiProvider } from '@shared/types'

import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useAppSelector } from '../hooks/use-app-selector'
import {
  addExcludedPattern,
  clearApiKey,
  loadSettings,
  removeExcludedPattern,
  saveAiProvider,
  saveApiKey,
  saveCliModel,
  selectAiProvider,
  selectCliInstalled,
  selectCliModel,
  selectExcludedPatterns,
  selectHasApiKey,
  selectSettingsLoading,
} from '../store/settings-slice'
import { addToast, closeSettings, selectSettingsOpen } from '../store/ui-slice'

import styles from './SettingsDialog.module.css'

export function SettingsDialog(): ReactElement | null {
  const dispatch = useAppDispatch()
  const isOpen = useAppSelector(selectSettingsOpen)
  const inputRef = useRef<HTMLInputElement>(null)

  const provider = useAppSelector(selectAiProvider)
  const hasKey = useAppSelector(selectHasApiKey)
  const storedCliModel = useAppSelector(selectCliModel)
  const cliInstalled = useAppSelector(selectCliInstalled)
  const excludedPatterns = useAppSelector(selectExcludedPatterns)
  const loading = useAppSelector(selectSettingsLoading)

  const [apiKey, setApiKey] = useState('')
  const [localCliModel, setLocalCliModel] = useState('')
  const [newPattern, setNewPattern] = useState('')

  useEffect(() => {
    if (!isOpen) return
    void dispatch(loadSettings())
    setApiKey('')
    setTimeout(() => { inputRef.current?.focus() }, 0)
  }, [isOpen, dispatch])

  // Sync local CLI model input when store value loads
  useEffect(() => {
    setLocalCliModel(storedCliModel)
  }, [storedCliModel])

  const handleProviderChange = useCallback((newProvider: AiProvider) => {
    void dispatch(saveAiProvider(newProvider))
  }, [dispatch])

  const handleClose = useCallback(() => {
    setApiKey('')
    setNewPattern('')
    dispatch(closeSettings())
  }, [dispatch])

  const handleSave = useCallback(async () => {
    if (provider === 'api') {
      const nextKey = apiKey.trim()
      if (!nextKey) {
        if (hasKey) {
          handleClose()
        }
        return
      }
      try {
        await dispatch(saveApiKey(nextKey)).unwrap()
        dispatch(addToast({ message: 'API key saved', variant: 'info' }))
        handleClose()
      } catch (err) {
        dispatch(addToast({ message: String(err), variant: 'error' }))
      }
    } else {
      try {
        await dispatch(saveCliModel(localCliModel.trim())).unwrap()
        dispatch(addToast({ message: 'CLI model saved', variant: 'info' }))
        handleClose()
      } catch (err) {
        dispatch(addToast({ message: String(err), variant: 'error' }))
      }
    }
  }, [provider, apiKey, localCliModel, dispatch, handleClose, hasKey])

  const handleClear = useCallback(async () => {
    try {
      await dispatch(clearApiKey()).unwrap()
      setApiKey('')
      dispatch(addToast({ message: 'API key cleared', variant: 'info' }))
    } catch (err) {
      dispatch(addToast({ message: String(err), variant: 'error' }))
    }
  }, [dispatch])

  const handleAddPattern = useCallback(async () => {
    const trimmed = newPattern.trim()
    if (!trimmed || excludedPatterns.includes(trimmed)) return
    try {
      await dispatch(addExcludedPattern(trimmed)).unwrap()
      setNewPattern('')
    } catch (err) {
      dispatch(addToast({ message: String(err), variant: 'error' }))
    }
  }, [newPattern, excludedPatterns, dispatch])

  const handleRemovePattern = useCallback(async (pattern: string) => {
    try {
      await dispatch(removeExcludedPattern(pattern)).unwrap()
    } catch (err) {
      dispatch(addToast({ message: String(err), variant: 'error' }))
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
          <label className={styles['label']}>AI Provider</label>
          <div className={styles['providerToggle']}>
            <button
              className={`${styles['providerOption']} ${provider === 'api' ? styles['providerActive'] : ''}`}
              onClick={() => { handleProviderChange('api') }}
              type="button"
            >
              Anthropic API
            </button>
            <button
              className={`${styles['providerOption']} ${provider === 'cli' ? styles['providerActive'] : ''}`}
              onClick={() => { handleProviderChange('cli') }}
              type="button"
            >
              Claude CLI
            </button>
          </div>
        </div>

        {provider === 'api' && (
          <div className={styles['field']}>
            <label className={styles['label']} htmlFor="api-key-input">
              Anthropic API Key
            </label>
            <input
              className={styles['input']}
              disabled={loading}
              id="api-key-input"
              onChange={(e) => { setApiKey(e.target.value) }}
              placeholder={hasKey && !apiKey ? '************' : 'sk-ant-...'}
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
        )}

        {provider === 'cli' && (
          <div className={styles['field']}>
            <label className={styles['label']} htmlFor="cli-model-input">
              Model (optional)
            </label>
            <input
              className={styles['input']}
              disabled={loading}
              id="cli-model-input"
              onChange={(e) => { setLocalCliModel(e.target.value) }}
              placeholder="Leave empty for CLI default"
              type="text"
              value={localCliModel}
            />
            <div className={styles['hint']}>
              Requires Claude Code installed. Uses <code>claude -p</code> headless mode.
            </div>
            {cliInstalled === false && (
              <div className={styles['warning']}>
                Claude CLI not detected. Install Claude Code from{' '}
                <code>https://docs.anthropic.com/en/docs/claude-code</code>
              </div>
            )}
          </div>
        )}

        <div className={styles['field']}>
          <label className={styles['label']}>
            Excluded File Patterns
          </label>
          <div className={styles['hint']}>
            Files matching these patterns are excluded from AI narrative processing.
            Matched against filename or path (e.g. &quot;.svg&quot;, &quot;generated/&quot;).
          </div>
          {excludedPatterns.length > 0 && (
            <div className={styles['patternList']}>
              {excludedPatterns.map((pattern) => (
                <span key={pattern} className={styles['patternChip']}>
                  <span className={styles['patternText']}>{pattern}</span>
                  <button
                    className={styles['patternRemove']}
                    onClick={() => { void handleRemovePattern(pattern) }}
                    type="button"
                    aria-label={`Remove ${pattern}`}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className={styles['patternInput']}>
            <input
              className={styles['input']}
              disabled={loading}
              onChange={(e) => { setNewPattern(e.target.value) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  e.stopPropagation()
                  void handleAddPattern()
                }
              }}
              placeholder=".svg, generated/, etc."
              type="text"
              value={newPattern}
            />
            <button
              className={styles['addButton']}
              disabled={loading || !newPattern.trim()}
              onClick={() => { void handleAddPattern() }}
              type="button"
            >
              Add
            </button>
          </div>
        </div>

        <div className={styles['actions']}>
          {provider === 'api' && hasKey && (
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
            disabled={loading || (provider === 'api' && !hasKey && !apiKey.trim())}
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
