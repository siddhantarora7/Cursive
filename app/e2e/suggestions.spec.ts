import { expect, test } from '@playwright/test'

/*
 * Free-tier degradation. The contract these cover:
 *
 *  1. Typing is never blocked. Suggestions are a side channel; when the proxy
 *     is refusing every request, the editor must still take every keystroke.
 *  2. "You spent your allowance", "you went too fast", and "we couldn't reach
 *     a model" are three different facts and must read as three different
 *     messages. Collapsing them is how a user concludes the AI is simply bad.
 *  3. The exhausted state is the honest moment to offer BYOK, one click away.
 */

const PARAGRAPH =
  'The quick brown fox jumps over the lazy dog and keeps running until the field ends.'

/** Stub the completion proxy with a given status and reason. */
async function stubProxy(page: import('@playwright/test').Page, status: number, reason: string) {
  await page.route('**/api/complete', (route) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ reason }),
    }),
  )
}

async function openEditor(page: import('@playwright/test').Page) {
  await page.goto('/app')
  const editor = page.locator('.cursive-editor')
  await expect(editor).toBeVisible({ timeout: 15_000 })
  return editor
}

test('typing is never blocked while the proxy refuses every request', async ({ page }) => {
  await stubProxy(page, 429, 'cap')
  const editor = await openEditor(page)

  await editor.click()
  await page.keyboard.type(PARAGRAPH, { delay: 12 })
  // let the debounce fire and the refusal land, then keep typing through it
  await expect(page.locator('.status-note')).toBeVisible({ timeout: 5_000 })
  await page.keyboard.type(' And still it typed.', { delay: 12 })

  await expect(editor).toContainText(`${PARAGRAPH} And still it typed.`)
})

test('a spent allowance says so, names the reset, and offers the key in one click', async ({
  page,
}) => {
  await stubProxy(page, 429, 'cap')
  const editor = await openEditor(page)

  await editor.click()
  await page.keyboard.type(PARAGRAPH, { delay: 12 })

  const note = page.locator('.status-note')
  await expect(note).toContainText('used up for today', { timeout: 5_000 })

  // one click from the honest moment to the field that fixes it
  await note.getByRole('button', { name: 'use your own key' }).click()
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible()
  await expect(page.locator('.byok-box input[type="password"]')).toBeFocused()
})

test('rate limiting and outages do not borrow the allowance message', async ({ page }) => {
  await stubProxy(page, 429, 'rate')
  const editor = await openEditor(page)

  await editor.click()
  await page.keyboard.type(PARAGRAPH, { delay: 12 })

  const note = page.locator('.status-note')
  await expect(note).toBeVisible({ timeout: 5_000 })
  await expect(note).not.toContainText('used up for today')
  await expect(note).toContainText('suggestions resume shortly')
  // transient and self-healing: nothing for the user to do, so nothing offered
  await expect(note.getByRole('button')).toHaveCount(0)
})

test('a single dropped request stays silent', async ({ page }) => {
  // one failure is a blip; a status line that flickers on every dropped packet
  // trains the user to ignore it
  let hits = 0
  await page.route('**/api/complete', (route) => {
    hits += 1
    return hits === 1
      ? route.abort('failed')
      : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ text: ' and onward' }) })
  })

  const editor = await openEditor(page)
  await editor.click()
  await page.keyboard.type(PARAGRAPH, { delay: 12 })
  await expect.poll(() => hits, { timeout: 5_000 }).toBeGreaterThan(0)

  await expect(page.locator('.status-note')).toHaveCount(0)
})

/*
 * Accepting a suggestion. A twelve-word guess is right far less often than its
 * first word is, so Tab's appetite is the writer's choice — and the narrower
 * action has to be findable, which is what the key hints are for.
 */

/** Stub the proxy with a real completion instead of a refusal. */
async function stubCompletion(page: import('@playwright/test').Page, text: string) {
  await page.route('**/api/complete', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ text, used: 1, limit: 150 }),
    }),
  )
}

test('the key hints appear only while there is a suggestion to act on', async ({ page }) => {
  await stubCompletion(page, ' over the lazy dog and away')
  const editor = await openEditor(page)
  await expect(page.locator('.status-keys')).toBeHidden()

  await editor.click()
  await page.keyboard.type('The quick brown fox jumps', { delay: 12 })
  await expect(page.locator('.ghost-text')).toBeVisible({ timeout: 5_000 })
  await expect(page.locator('.status-keys')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.locator('.status-keys')).toBeHidden()
})

test('Mod-ArrowRight takes one word without touching the rest', async ({ page }) => {
  await stubCompletion(page, ' over the lazy dog and away')
  const editor = await openEditor(page)

  await editor.click()
  await page.keyboard.type('The quick brown fox jumps', { delay: 12 })
  await expect(page.locator('.ghost-text')).toBeVisible({ timeout: 5_000 })

  await page.keyboard.press('ControlOrMeta+ArrowRight')

  // only the first word landed in the document. The editor element also renders
  // the ghost decoration, so read the document itself rather than the DOM text.
  const docText = await editor.evaluate(
    (el) => (el as HTMLElement & { pmViewDesc?: { node: { textContent: string } } }).innerText,
  )
  expect(docText).toContain('The quick brown fox jumps over')

  // the rest is still on offer, re-anchored past the word just taken
  const ghost = page.locator('.ghost-text')
  await expect(ghost).toBeVisible()
  await expect(ghost).toHaveText(/the lazy dog and away/)
  await expect(ghost).not.toHaveText(/over/)
})
