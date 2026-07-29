import { expect, test } from '@playwright/test'

/*
 * Local stats and the monthly report. The contract:
 *  - writing produces numbers, without any network call
 *  - the report is computed from the local store, so it survives a reload
 *  - it renders an image the writer can actually save
 */

test('writing produces a local report, and nothing is sent anywhere', async ({ page }) => {
  const external: string[] = []
  page.on('request', (r) => {
    const url = r.url()
    if (!url.startsWith('http://localhost:4173') && !url.startsWith('data:')) external.push(url)
  })

  await page.goto('/app')
  const editor = page.locator('.cursive-editor')
  await expect(editor).toBeVisible({ timeout: 15_000 })

  await editor.click()
  await page.keyboard.type(
    'The harbour was quiet that morning. The harbour boats had not yet left the moorings. ',
    { delay: 8 },
  )

  await page.getByRole('button', { name: 'View' }).click()
  await page.getByRole('button', { name: 'Your writing stats…' }).click()

  const panel = page.getByRole('dialog', { name: 'Your writing stats' })
  await expect(panel).toBeVisible()

  // words counted, and the writer's own vocabulary surfaced
  await expect(panel.getByText('words', { exact: true })).toBeVisible()
  await expect(panel.locator('.ww-word', { hasText: 'harbour' })).toBeVisible()
  await expect(panel.getByText('Computed here. Never uploaded.')).toBeVisible()

  expect(external).toEqual([])
})

test('the report is read back from local storage after a reload', async ({ page }) => {
  await page.goto('/app')
  const editor = page.locator('.cursive-editor')
  await expect(editor).toBeVisible({ timeout: 15_000 })
  await editor.click()
  await page.keyboard.type('Lighthouse lighthouse lighthouse keeper counted every passing ship. ', {
    delay: 8,
  })

  // force the debounced write, then start a completely fresh page
  await page.evaluate(() => new Promise((r) => setTimeout(r, 6_000)))
  await page.reload()
  await expect(page.locator('.cursive-editor')).toBeVisible({ timeout: 15_000 })

  await page.getByRole('button', { name: 'View' }).click()
  await page.getByRole('button', { name: 'Your writing stats…' }).click()

  const panel = page.getByRole('dialog', { name: 'Your writing stats' })
  await expect(panel.locator('.ww-word', { hasText: 'lighthouse' })).toBeVisible()
})

test('the monthly card renders as a real downloadable image', async ({ page }) => {
  await page.goto('/app')
  const editor = page.locator('.cursive-editor')
  await expect(editor).toBeVisible({ timeout: 15_000 })
  await editor.click()
  await page.keyboard.type('Some words worth counting on a quiet afternoon. ', { delay: 8 })

  await page.getByRole('button', { name: 'View' }).click()
  await page.getByRole('button', { name: 'Your writing stats…' }).click()

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Save as image' }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/^cursive-\d{4}-\d{2}\.png$/)
})
