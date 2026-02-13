import { _electron as electron } from '@playwright/test'
import { expect, test } from '@playwright/test'

test('app opens and displays Diffy', async () => {
  const app = await electron.launch({
    args: ['./out/main/index.js'],
  })

  const window = await app.firstWindow()
  const title = await window.title()
  expect(title).toBe('Diffy')

  const body = await window.locator('body').textContent()
  expect(body).toContain('Diffy')

  await app.close()
})
