import type { DiffyApi } from '@shared/ipc'

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    api: DiffyApi
  }
}
