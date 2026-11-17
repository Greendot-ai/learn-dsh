import { lessons } from '../../scripts/lessons.ts'

export const progressKey = 'learn-dsh-progress-v1'
export function readProgress(raw: string | null, ids: readonly string[]): Set<string> {
  if (!raw) return new Set()
  try {
    const value: unknown = JSON.parse(raw)
    return new Set(Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && ids.includes(id)) : [])
  } catch (error) { return new Set() /* A malformed local preference must not prevent reading. */ }
}
export function parseRoute(hash: string) {
  const [path = '/', query = ''] = hash.replace(/^#/, '').split('?')
  const parts = path.split('/').filter(Boolean)
  return { kind: parts[0] || 'home', id: parts[1] || '', params: new URLSearchParams(query) }
}

/** Keep existing hash URLs working after switching to pre-rendered documents. */
export function legacyTarget(hash: string, base: string) {
  if (!hash.startsWith('#/')) return
  const route = parseRoute(hash)
  const validLesson = lessons.some(([id]) => id === route.id)
  const validGuide = ['running', 'architecture', 'official-map'].includes(route.id)
  const path = route.kind === 'lesson' && validLesson ? `lessons/${route.id}/`
    : route.kind === 'guide' && validGuide ? `guides/${route.id}/` : ''
  const params = new URLSearchParams()
  const tab = route.params.get('tab')
  if (path.startsWith('lessons/') && (tab === 'source' || tab === 'mechanism')) params.set('view', tab)
  if (params.get('view') === 'source' && route.params.has('file')) params.set('file', route.params.get('file')!)
  const section = route.params.get('section')
  return `${base}${path}${params.size ? `?${params}` : ''}${section ? `#${encodeURIComponent(section)}` : ''}`
}
