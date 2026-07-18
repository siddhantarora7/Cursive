import { DEFAULT_SETTINGS, getDb, type Settings } from './db'

const KEY = 'settings'

export async function loadSettings(): Promise<Settings> {
  const stored = await (await getDb()).get('settings', KEY)
  // merge so new fields get defaults after upgrades
  const settings = { ...DEFAULT_SETTINGS, ...stored }
  // the default flipped to light; follow it unless the user explicitly chose a theme
  if (!settings.themeChosen) settings.themeId = DEFAULT_SETTINGS.themeId
  return settings
}

export async function saveSettings(settings: Settings): Promise<void> {
  await (await getDb()).put('settings', settings, KEY)
}

/* BYOK keys live in localStorage only — never IndexedDB, never the server.
   (localStorage per spec: easy for users to audit and clear.) */
export function getByokKey(provider: string): string {
  return localStorage.getItem(`cursive.byok.${provider}`) ?? ''
}

export function setByokKey(provider: string, key: string): void {
  if (key) localStorage.setItem(`cursive.byok.${provider}`, key)
  else localStorage.removeItem(`cursive.byok.${provider}`)
}

/** Anonymous, resettable client id for free-tier caps. Not an account. */
export function getClientId(): string {
  let id = localStorage.getItem('cursive.client-id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('cursive.client-id', id)
  }
  return id
}
