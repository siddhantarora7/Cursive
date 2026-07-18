import { getDb, type DocRecord, type PMJson } from './db'

export async function listDocs(): Promise<DocRecord[]> {
  const db = await getDb()
  const docs = await db.getAllFromIndex('docs', 'by-updated')
  return docs.reverse() // newest first
}

export async function getDoc(id: string): Promise<DocRecord | undefined> {
  return (await getDb()).get('docs', id)
}

export async function createDoc(): Promise<DocRecord> {
  const now = Date.now()
  const doc: DocRecord = {
    id: crypto.randomUUID(),
    title: 'Untitled',
    content: null,
    intent: '',
    createdAt: now,
    updatedAt: now,
    wordCount: 0,
  }
  await (await getDb()).put('docs', doc)
  return doc
}

export async function saveDocContent(
  id: string,
  content: PMJson,
  derived: { title: string; wordCount: number },
): Promise<void> {
  const db = await getDb()
  const doc = await db.get('docs', id)
  if (!doc) return
  await db.put('docs', {
    ...doc,
    content,
    title: derived.title,
    wordCount: derived.wordCount,
    updatedAt: Date.now(),
  })
}

export async function updateDocMeta(
  id: string,
  patch: Partial<Pick<DocRecord, 'title' | 'intent'>>,
): Promise<void> {
  const db = await getDb()
  const doc = await db.get('docs', id)
  if (!doc) return
  await db.put('docs', { ...doc, ...patch, updatedAt: Date.now() })
}

export async function deleteDoc(id: string): Promise<void> {
  await (await getDb()).delete('docs', id)
}
