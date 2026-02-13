import { _electron as electron } from '@playwright/test'
import { expect, test } from '@playwright/test'

test('app opens and displays initial UI', async () => {
  const app = await electron.launch({
    args: ['./out/main/index.js'],
  })

  const window = await app.firstWindow()
  const title = await window.title()
  expect(title).toBe('Diffy')

  // TopBar should show app name when no repo is open
  const topBar = window.locator('[class*="topBar"]')
  await expect(topBar).toBeVisible()

  // Open button should be present
  const openButton = window.locator('button', { hasText: 'Open' })
  await expect(openButton).toBeVisible()

  // Placeholder message should be visible
  const placeholder = window.locator('text=Open a repository to get started')
  await expect(placeholder).toBeVisible()

  await app.close()
})
