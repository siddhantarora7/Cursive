import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Rewrite the social-card image paths to absolute URLs at build time.
 *
 * `og:image` and `twitter:image` were relative. Several crawlers — Slack,
 * Discord, iMessage among them — ignore a relative image path outright, so a
 * pasted link rendered with no preview at all. For a product whose entire
 * distribution is people pasting a link, that is worth more than it looks.
 *
 * The domain is not hardcoded because the repo does not know it. In order:
 * an explicit SITE_URL, then Vercel's own production domain, which is present
 * in the build environment without anyone having to configure it. If neither
 * exists (a plain local build), the tags stay relative — exactly today's
 * behaviour, so this can never make things worse than they already were.
 */
function absoluteSocialImages(): Plugin {
  const raw = process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || ''
  const origin = raw && !/^https?:\/\//.test(raw) ? `https://${raw}` : raw
  return {
    name: 'cursive:absolute-social-images',
    transformIndexHtml(html) {
      if (!origin) return html
      const base = origin.replace(/\/$/, '')
      return html.replace(
        /(property="og:image"|name="twitter:image") content="(\/[^"]*)"/g,
        (_m, attr: string, path: string) => `${attr} content="${base}${path}"`,
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), absoluteSocialImages()],
  build: { target: 'es2022' },
})
