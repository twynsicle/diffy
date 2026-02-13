import type { DiffyApi } from '../preload'

declare global {
  type Window = {
    api: DiffyApi
  }
}
