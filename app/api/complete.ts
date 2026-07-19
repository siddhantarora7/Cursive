import { handleComplete } from './_lib/complete-core'

// HTTP-method export (Web API signature) on the Node runtime / Fluid Compute —
// the unambiguous handler shape; a default export risks legacy (req, res) invocation.
export function POST(req: Request): Promise<Response> {
  return handleComplete(req, { env: process.env as Record<string, string | undefined>, fetch })
}
