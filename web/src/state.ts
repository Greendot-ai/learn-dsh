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
