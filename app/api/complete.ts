import { handleComplete } from './_lib/complete-core'

// Web-standard handler on the Node runtime (Fluid Compute) — the current
// Vercel default; the legacy `config = { runtime: 'edge' }` export is deprecated.
export default function handler(req: Request): Promise<Response> {
  return handleComplete(req, { env: process.env as Record<string, string | undefined>, fetch })
}
