/**
 * Node ESM demands extension-qualified specifiers; the app source is written
 * for Vite's bundler resolution and omits them. This hook retries a failed
 * relative import with `.ts` appended, so scripts can import the real
 * `src/core` modules instead of copying them — a copy would defeat the point
 * of measuring the shipping code.
 */
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context)
  } catch (err) {
    if (specifier.startsWith('.')) {
      for (const suffix of ['.ts', '/index.ts']) {
        try {
          return await next(specifier + suffix, context)
        } catch {
          /* fall through to the original error */
        }
      }
    }
    throw err
  }
}
