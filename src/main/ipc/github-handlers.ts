import { ipcMain } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc'
import type { PrReference, Result } from '@shared/types'

import { checkGhInstalled, fetchPrData } from '../gh-runner'

export function registerGithubHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.GH_CHECK_INSTALLED, async () => {
    return checkGhInstalled()
  })

  ipcMain.handle(IPC_CHANNELS.GH_FETCH_PR, async (_event, ref: unknown) => {
    if (
      typeof ref !== 'object' ||
      ref === null ||
      typeof (ref as PrReference).owner !== 'string' ||
      typeof (ref as PrReference).repo !== 'string' ||
      typeof (ref as PrReference).number !== 'number'
    ) {
      return { ok: false, error: 'Invalid PR reference' } satisfies Result<never>
    }
    return fetchPrData(ref as PrReference)
  })
}
