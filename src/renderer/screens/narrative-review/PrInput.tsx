import { type FormEvent, type ReactElement, useEffect, useState } from 'react'

import { parsePrUrl } from '@shared/parse-pr-url'

import { useAppDispatch } from '../../hooks/use-app-dispatch'
import { useAppSelector } from '../../hooks/use-app-selector'
import { fetchPr, selectPrLoading, setPrUrl } from '../../store/narrative-slice'
import { loadLastPrUrl, saveLastPrUrl, selectLastPrUrl } from '../../store/settings-slice'

import styles from './PrInput.module.css'

type PrInputProps = {
  onBack?: () => void
}

export function PrInput({ onBack }: PrInputProps): ReactElement {
  const dispatch = useAppDispatch()
  const loading = useAppSelector(selectPrLoading)
  const lastPrUrl = useAppSelector(selectLastPrUrl)
  const [inputValue, setInputValue] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    void dispatch(loadLastPrUrl())
  }, [dispatch])

  // Populate input when lastPrUrl loads from store
  useEffect(() => {
    if (lastPrUrl && !inputValue) {
      setInputValue(lastPrUrl)
    }
  }, [lastPrUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(e: FormEvent): void {
    e.preventDefault()
    setValidationError(null)

    const ref = parsePrUrl(inputValue)
    if (!ref) {
      setValidationError('Enter a valid GitHub PR URL (e.g. https://github.com/owner/repo/pull/123)')
      return
    }

    dispatch(setPrUrl(inputValue.trim()))
    void dispatch(saveLastPrUrl(inputValue.trim()))
    void dispatch(fetchPr(ref))
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.input}
        type="text"
        placeholder="https://github.com/owner/repo/pull/123"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value)
          if (validationError) setValidationError(null)
        }}
        disabled={loading}
      />
      <div className={styles.actions}>
        {onBack && (
          <button
            className={styles.backButton}
            type="button"
            onClick={onBack}
            disabled={loading}
          >
            Back
          </button>
        )}
        <button
          className={styles.button}
          type="submit"
          disabled={loading || inputValue.trim().length === 0}
        >
          {loading ? <span className={styles.spinner}>&#8635;</span> : 'Fetch PR'}
        </button>
      </div>
      {validationError && <span className={styles.error}>{validationError}</span>}
    </form>
  )
}
