import { useEffect, useRef } from 'react'

import { useAppDispatch } from './use-app-dispatch'
import { useAppSelector } from './use-app-selector'
import { selectSelected } from '../store/changes-slice'
import { clearDiff, loadDiff } from '../store/diff-slice'

export function useDiffLoader(): void {
  const dispatch = useAppDispatch()
  const selected = useAppSelector(selectSelected)
  const abortRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (abortRef.current) {
      abortRef.current()
      abortRef.current = null
    }

    if (!selected) {
      dispatch(clearDiff())
      return
    }

    const promise = dispatch(
      loadDiff({
        path: selected.path,
        section: selected.section,
        origPath: selected.origPath,
      }),
    )

    abortRef.current = () => {
      promise.abort()
    }

    return () => {
      if (abortRef.current) {
        abortRef.current()
        abortRef.current = null
      }
    }
  }, [dispatch, selected])
}
