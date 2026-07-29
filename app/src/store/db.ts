import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { DayAggregate } from '../core/stats/events'
import type { Theme } from '../core/theme/types'

/** ProseMirror document JSON — opaque to the store. */
export type PMJson = Record<string, unknown>

export interface DocRecord {
  id: string
  title: string
  content: PMJson | null
  /** "Document intent" sent as system context with suggestions. */
  intent: string
  createdAt: number
  updatedAt: number
  wordCount: number
  /** user renamed explicitly → stop deriving the title from the first line */
  renamed?: boolean
}

export type AiMode = 'free' | 'byok' | 'off'
export type ByokProvider = 'anthropic' | 'gemini' | 'openai' | 'openrouter'

export interface Settings {
  version: 1
  themeId: string
  customTheme: Theme | null
  /** null → use the theme's font */
  fontOverride: string | null
  /** editor typography is global (Monkeytype-style), not per-selection */
  editorFontSize: number
  lineHeight: number
  caret: { smoothing: number; blink: boolean }
  aiMode: AiMode
  byokProvider: ByokProvider
  /** model override per provider; '' → adapter default */
  byokModel: string
  spellcheck: boolean
  autocorrect: boolean
  zen: boolean
  fx: { sparks: boolean; streak: boolean; shake: boolean }
  sound: { pack: 'off' | 'thock' | 'typewriter' | 'pop'; volume: number }
  /** true once the user explicitly picked a theme */
  themeChosen: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  themeId: 'paper',
  customTheme: null,
  fontOverride: null,
  editorFontSize: 17,
  lineHeight: 1.7,
  caret: { smoothing: 0.5, blink: true },
  aiMode: 'free',
  byokProvider: 'anthropic',
  byokModel: '',
  spellcheck: true,
  autocorrect: true,
  zen: false,
  fx: { sparks: true, streak: true, shake: false },
  sound: { pack: 'off', volume: 0.6 },
  themeChosen: false,
}

interface CursiveDB extends DBSchema {
  docs: {
    key: string
    value: DocRecord
    indexes: { 'by-updated': number }
  }
  settings: { key: string; value: Settings }
  /** key: local `YYYY-MM-DD`; written by store/stats.ts, never sent anywhere */
  stats: { key: string; value: DayAggregate }
}

let dbPromise: Promise<IDBPDatabase<CursiveDB>> | null = null

export function getDb(): Promise<IDBPDatabase<CursiveDB>> {
  dbPromise ??= openDB<CursiveDB>('cursive', 1, {
    upgrade(db) {
      const docs = db.createObjectStore('docs', { keyPath: 'id' })
      docs.createIndex('by-updated', 'updatedAt')
      db.createObjectStore('settings')
      db.createObjectStore('stats')
    },
  })
  return dbPromise
}
