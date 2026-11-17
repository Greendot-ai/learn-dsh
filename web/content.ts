import { readFile, readdir } from 'node:fs/promises'
import { dirname, posix, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import { visit } from 'unist-util-visit'
import type { Root } from 'mdast'
import { lessons } from '../scripts/lessons.ts'
import { metadata } from './meta.ts'
import type { Course, SourceFile } from './types.ts'

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const repository = 'https://github.com/Greendot-ai/learn-dsh'
export const guidePaths = new Map([
  ['docs/running.md', 'running'], ['docs/architecture.md', 'architecture'], ['docs/official-map.md', 'official-map'],
])
export function siteBase(value = process.env.SITE_BASE || '/') {
  const path = value.split('/').filter(Boolean).join('/')
  return path ? `/${path}/` : '/'
}
export function rewriteLink(href: string, current: string, sources: Set<string>, base = '/') {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href) || href.startsWith('#')) return href
  const [relative = '', fragment = ''] = href.split('#')
  const path = posix.normalize(posix.join(posix.dirname(current), relative))
  const section = fragment ? `#${fragment}` : ''
  const id = lessons.find(([lesson]) => path === `${lesson}/README.md`)?.[0]
  if (id) return `${base}lessons/${id}/${section}`
  const guide = guidePaths.get(path)
  if (guide) return `${base}guides/${guide}/${section}`
  if (path === 'README.md') return base
  if (sources.has(path)) {
    const lesson = lessons.find(([lesson]) => current.startsWith(`${lesson}/`))?.[0]
    if (lesson) return `${base}lessons/${lesson}/?view=source&file=${encodeURIComponent(path)}`
  }
  return `${repository}/blob/main/${path.split('/').map(encodeURIComponent).join('/')}${section}`
}
/** Transform the Markdown tree so links inside code examples remain literal. */
export function prepareMarkdown(raw: string, path: string, sources: Set<string>, base = '/') {
  const clean = raw.replace(/^# .+\n/, '').replace(/^(?:上一章：|\[课程目录\]).*\n/gm, '')
  return String(unified().use(remarkParse).use(() => (tree: Root) => {
    visit(tree, 'link', node => {
      node.url = /^(?:javascript|vbscript|data|file):/i.test(node.url.trim()) ? '' : rewriteLink(node.url, path, sources, base)
    })
    visit(tree, 'definition', node => {
      node.url = /^(?:javascript|vbscript|data|file):/i.test(node.url.trim()) ? '' : rewriteLink(node.url, path, sources, base)
    })
    visit(tree, 'html', node => {
      node.value = node.value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    })
  }).use(remarkStringify, { fences: true }).processSync(clean))
}
export async function loadCourse(): Promise<Course> {
  const paths = [
    ...(await readdir(resolve(root, 'lib'))).filter(path => path.endsWith('.ts')).map(path => `lib/${path}`),
    'scripts/lesson.ts', 'scripts/lessons.ts', 'scripts/plugin-patch.ts',
  ]
  for (const [id] of lessons) paths.push(...(await readdir(resolve(root, id))).filter(path => path.endsWith('.ts')).map(path => `${id}/${path}`))
  const files: Record<string, SourceFile> = {}
  for (const path of paths) {
    const raw = await readFile(resolve(root, path), 'utf8')
    files[path] = { path, raw, lines: raw.trimEnd().split('\n').length }
  }
  function dependencies(path: string, found = new Set<string>()): string[] {
    if (found.has(path) || !files[path]) return [...found]
    found.add(path)
    for (const match of files[path]!.raw.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      if (match[1]?.startsWith('.')) dependencies(posix.normalize(posix.join(posix.dirname(path), match[1])), found)
    }
    return [...found]
  }
  const course: Course = { lessons: [], files, guides: [] }
  for (const [id] of lessons) {
    const meta = metadata[id]
    if (!meta) throw new Error(`Missing website metadata: ${id}`)
    const raw = await readFile(resolve(root, id, 'README.md'), 'utf8')
    course.lessons.push({ ...meta, id, number: id.slice(1, 3), raw,
      minutes: Math.max(3, Math.ceil(raw.length / 450)), files: dependencies(`${id}/code.ts`) })
  }
  for (const [path, id] of guidePaths) {
    const raw = await readFile(resolve(root, path), 'utf8')
    course.guides.push({ id, path, title: raw.match(/^# (.+)/)?.[1] ?? id, raw })
  }
  return course
}
