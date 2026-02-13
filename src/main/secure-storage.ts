import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { app, safeStorage } from 'electron'

function getKeyPath(): string {
  return join(app.getPath('userData'), 'api-key.enc')
}

export function setApiKey(key: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption is not available on this system')
  }
  const encrypted = safeStorage.encryptString(key)
  writeFileSync(getKeyPath(), encrypted)
}

export function getApiKey(): string {
  const keyPath = getKeyPath()
  if (!existsSync(keyPath)) {
    return ''
  }
  const encrypted = readFileSync(keyPath)
  return safeStorage.decryptString(encrypted)
}

export function hasApiKey(): boolean {
  return existsSync(getKeyPath())
}

export function clearApiKey(): void {
  const keyPath = getKeyPath()
  if (existsSync(keyPath)) {
    unlinkSync(keyPath)
  }
}
