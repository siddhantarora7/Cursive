import { handleComplete } from './_lib/complete-core'

export const config = { runtime: 'edge' }

export default function handler(req: Request): Promise<Response> {
  return handleComplete(req, { env: process.env as Record<string, string | undefined>, fetch })
}
