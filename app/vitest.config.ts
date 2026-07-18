import { defineConfig } from 'vitest/config'

// Default environment is node: everything under src/core must run without DOM
// globals — that absence is part of the core/ purity contract. Editor plugin
// tests opt into jsdom per-file with `// @vitest-environment jsdom`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'api/**/*.test.ts'],
  },
})
