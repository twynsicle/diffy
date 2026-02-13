import type { ReactElement } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import type { AiProvider } from '@shared/types'

import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useAppSelector } from '../hooks/use-app-selector'
import { addToast, closeSettings, selectSettingsOpen } from '../store/ui-slice'

import styles from './SettingsDialog.module.css'

export function SettingsDialog(): ReactElement | null {
  const dispatch = useAppDispatch()
  const isOpen = useAppSelector(selectSettingsOpen)
  const inputRef = useRef<HTMLInputElement>(null)

  const [provider, setProvider] = useState<AiProvider>('api')
  const [apiKey, setApiKey] = useState('')
  const [hasKey, setHasKey] = useState(false)
  const [cliModel, setCliModel] = useState('')
  const [cliInstalled, setCliInstalled] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)

  const [excludedPatterns, setExcludedPatterns] = useState<string[]>([])
  const [newPattern, setNewPattern] = useState('')

  useEffect(() => {
    if (!isOpen) return

    setLoading(true)
    void (async () => {
      const providerResult = await window.api.getAiProvider()
      if (providerResult.ok) {
        setProvider(providerResult.data)
      }

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

      const modelResult = await window.api.getCliModel()
      if (modelResult.ok) {
        setCliModel(modelResult.data)
      }

      const cliResult = await window.api.checkClaudeCliInstalled()
      if (cliResult.ok) {
        setCliInstalled(cliResult.data)
      }

      const patternsResult = await window.api.getExcludedPatterns()
      if (patternsResult.ok) {
        setExcludedPatterns(patternsResult.data)
      }

      setLoading(false)
      setTimeout(() => { inputRef.current?.focus() }, 0)
    })()
  }, [isOpen])

  const handleProviderChange = useCallback((newProvider: AiProvider) => {
    setProvider(newProvider)
    void window.api.setAiProvider(newProvider)
  }, [])

  const handleClose = useCallback(() => {
    setApiKey('')
    setHasKey(false)
    setNewPattern('')
    dispatch(closeSettings())
  }, [dispatch])

  const handleSave = useCallback(async () => {
    if (provider === 'api') {
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
    } else {
      setLoading(true)
      const result = await window.api.setCliModel(cliModel.trim())
      setLoading(false)
      if (result.ok) {
        dispatch(addToast({ message: 'CLI model saved', variant: 'info' }))
        handleClose()
      } else {
        dispatch(addToast({ message: result.error, variant: 'error' }))
      }
    }
  }, [provider, apiKey, cliModel, dispatch, handleClose])

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

  const handleAddPattern = useCallback(async () => {
    const trimmed = newPattern.trim()
    if (!trimmed || excludedPatterns.includes(trimmed)) return
    const updated = [...excludedPatterns, trimmed]
    const result = await window.api.setExcludedPatterns(updated)
    if (result.ok) {
      setExcludedPatterns(updated)
      setNewPattern('')
    } else {
      dispatch(addToast({ message: result.error, variant: 'error' }))
    }
  }, [newPattern, excludedPatterns, dispatch])

  const handleRemovePattern = useCallback(async (pattern: string) => {
    const updated = excludedPatterns.filter((p) => p !== pattern)
    const result = await window.api.setExcludedPatterns(updated)
    if (result.ok) {
      setExcludedPatterns(updated)
    } else {
      dispatch(addToast({ message: result.error, variant: 'error' }))
    }
  }, [excludedPatterns, dispatch])

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
              onChange={(e) => { setCliModel(e.target.value) }}
              placeholder="Leave empty for CLI default"
              type="text"
              value={cliModel}
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
            disabled={loading || (provider === 'api' && !apiKey.trim())}
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
