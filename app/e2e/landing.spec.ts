import { expect, test } from '@playwright/test'

/*
 * These cover the three things a landing-page redesign must never quietly
 * break: the hero says what the product does, the CTA actually reaches a
 * working editor, and the privacy page still carries the training-data
 * disclosure that docs/ARCHITECTURE.md section 5 requires.
 *
 * The pinned sections are asserted through scroll position rather than time,
 * which is the same property the implementation relies on: every pinned frame
 * is a pure function of how far down the page you are.
 */

test('hero renders and the CTA navigates to the editor', async ({ page }) => {
  await page.goto('/')

  const h1 = page.getByRole('heading', { level: 1 })
  await expect(h1).toContainText('Type half.')
  await expect(h1).toContainText('Tab the rest.')
  await expect(page.getByText('Cursive drafts the next few words')).toBeVisible()

  await page.getByRole('link', { name: 'Start writing' }).first().click()
  await expect(page).toHaveURL(/\/app$/)
  // the editor chunk mounts and produces the contenteditable surface
  await expect(page.locator('.cursive-editor')).toBeVisible({ timeout: 15_000 })
})

/*
 * Scrub a pinned section to a fraction of its own progress.
 *
 * Note boundingBox() is viewport-relative, so the document offset has to be
 * recovered inside the page. The scrollable range of a pin is its height minus
 * one viewport, which is exactly the range useScroll maps 0 to 1 over.
 */
async function scrubPin(page: import('@playwright/test').Page, id: string, at: number) {
  await page.locator(id).scrollIntoViewIfNeeded()
  await page.evaluate(
    ({ id, at }) => {
      const el = document.querySelector(id)
      if (!el) throw new Error(`${id} not found`)
      const top = el.getBoundingClientRect().top + window.scrollY
      const range = el.getBoundingClientRect().height - window.innerHeight
      window.scrollTo(0, top + range * at)
    },
    { id, at },
  )
  await page.waitForTimeout(300)
}

test('the pinned ghost-text demo advances with scroll', async ({ page }) => {
  await page.goto('/')

  await page.locator('#ghost').scrollIntoViewIfNeeded()
  await expect(page.getByText('Your next few words, already there.')).toBeVisible()

  // The stage counter is a pure function of scroll position, both ways.
  await scrubPin(page, '#ghost', 0.02)
  await expect(page.getByText('1 / 3')).toBeVisible({ timeout: 5_000 })

  await scrubPin(page, '#ghost', 0.95)
  await expect(page.getByText('3 / 3')).toBeVisible({ timeout: 5_000 })

  await scrubPin(page, '#ghost', 0.02)
  await expect(page.getByText('1 / 3')).toBeVisible({ timeout: 5_000 })
})

test('the themes section cycles real editor themes', async ({ page }) => {
  await page.goto('/')

  await scrubPin(page, '#themes', 0.02)
  await expect(page.getByText('Paper', { exact: true })).toBeVisible({ timeout: 5_000 })

  await scrubPin(page, '#themes', 0.97)
  await expect(page.getByText('Snow', { exact: true })).toBeVisible({ timeout: 5_000 })
})

test('the page never scrolls sideways', async ({ page }) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await page.waitForTimeout(400)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(0)
  }
})

test('reduced motion releases the pins and still tells the story', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.goto('/')

  // The manifesto is a sentence rather than a frozen frame of the mechanic.
  await expect(
    page.getByText('You don’t lose the sentence to not knowing the words.'),
  ).toBeVisible()

  // Pinned sections give their scroll height back.
  const height = await page.evaluate(() => document.body.scrollHeight)
  expect(height).toBeLessThan(12_000)

  await ctx.close()
})

test('privacy page carries the training-data disclosure', async ({ page }) => {
  await page.goto('/privacy')
  await expect(page.getByText('Free tier and training data')).toBeVisible()
  await expect(page.getByText('may be used by them to improve their models')).toBeVisible()
})
