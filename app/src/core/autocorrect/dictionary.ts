/**
 * The dictionary is a plain text asset: one lowercase word per line, ordered
 * by corpus frequency (SymSpell's en_82_765 list, MIT). Rank doubles as the
 * frequency signal, so the asset stays tiny and parsing is one split.
 */
export type Dictionary = Map<string, number>

export function parseDictionary(text: string): Dictionary {
  const map: Dictionary = new Map()
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const w = lines[i]!.trim()
    if (w) map.set(w, map.size)
  }
  return map
}
