import { type FormEvent, type ReactElement, useEffect, useState } from 'react'

import { parsePrUrl } from '@shared/parse-pr-url'

import { useAppDispatch } from '../hooks/use-app-dispatch'
import { useAppSelector } from '../hooks/use-app-selector'
import { fetchPr, selectPrLoading, setPrUrl } from '../store/narrative-slice'

import styles from './PrInput.module.css'

export function PrInput(): ReactElement {
  const dispatch = useAppDispatch()
  const loading = useAppSelector(selectPrLoading)
  const [inputValue, setInputValue] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const lastUrl = await window.api.getLastPrUrl()
      if (lastUrl) {
        setInputValue(lastUrl)
      }
    })()
  }, [])

  function handleSubmit(e: FormEvent): void {
    e.preventDefault()
    setValidationError(null)

    const ref = parsePrUrl(inputValue)
    if (!ref) {
      setValidationError('Enter a valid GitHub PR URL (e.g. https://github.com/owner/repo/pull/123)')
      return
    }

    dispatch(setPrUrl(inputValue.trim()))
    void window.api.setLastPrUrl(inputValue.trim())
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
      <button
        className={styles.button}
        type="submit"
        disabled={loading || inputValue.trim().length === 0}
      >
        {loading ? <span className={styles.spinner}>&#8635;</span> : 'Fetch PR'}
      </button>
      {validationError && <span className={styles.error}>{validationError}</span>}
    </form>
  )
}
