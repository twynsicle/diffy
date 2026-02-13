import type { ReactElement } from 'react'

export function App(): ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-family)',
        fontSize: '2rem',
        fontWeight: 600,
      }}
    >
      Diffy
    </div>
  )
}
