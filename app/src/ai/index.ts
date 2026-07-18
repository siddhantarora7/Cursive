import type { CompletionFn } from '../editor/suggestionController'
import type { Settings } from '../store/db'
import { getByokKey } from '../store/settings'
import { directCompletion } from './direct'
import { proxyCompletion } from './proxy'

/** Pick the transport for the current settings. Swap = config, not refactor. */
export function buildCompletionFn(settings: Settings): CompletionFn | null {
  if (settings.aiMode === 'off') return null
  if (settings.aiMode === 'byok') {
    const key = getByokKey(settings.byokProvider)
    if (!key) return null
    return directCompletion({
      provider: settings.byokProvider,
      key,
      model: settings.byokModel,
    })
  }
  return proxyCompletion()
}
