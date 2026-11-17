import { readFile, readdir } from 'node:fs/promises'
import { dirname, posix, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import { lessons } from '../scripts/lessons.ts'
import { metadata } from './meta.ts'
import type { Course, Guide, SourceFile } from './types.ts'

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repository = 'https://github.com/Greendot-ai/learn-dsh/blob/main/'
const guidePaths = new Map([
  ['docs/running.md', 'running'], ['docs/architecture.md', 'architecture'], ['docs/official-map.md', 'official-map'],
])
export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
}
export function rewriteLink(href: string, current: string, sources: Set<string>): string {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) return href
  const [relative = '', fragment] = href.split('#')
  const path = relative ? posix.normalize(posix.join(posix.dirname(current), relative)) : current
  const section = fragment ? `section=${encodeURIComponent(decodeURIComponent(fragment))}` : ''
  const id = lessons.find(([lesson]) => path === `${lesson}/README.md`)?.[0]
  if (id) return `#/lesson/${id}${section ? `?${section}` : ''}`
  const guide = guidePaths.get(path)
  if (guide) return `#/guide/${guide}${section ? `?${section}` : ''}`
  if (path === 'README.md') return '#/'
  if (sources.has(path)) {
    const lesson = lessons.find(([lesson]) => current.startsWith(`${lesson}/`))?.[0] ?? 's11_harness'
    return `#/lesson/${lesson}?tab=source&file=${encodeURIComponent(path)}`
  }
  return `${repository}${path.split('/').map(encodeURIComponent).join('/')}${fragment ? `#${fragment}` : ''}`
}
export function renderMarkdown(raw: string, path: string, sources: Set<string>) {
  const headings: { id: string; title: string }[] = []
  const counts = new Map<string, number>()
  const md = new MarkdownIt({ html: false, linkify: true, typographer: false })
  md.renderer.rules.heading_open = (tokens, index, options, env, renderer) => {
    const token = tokens[index]!
    const title = tokens[index + 1]?.content ?? ''
    const slug = title.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-') || 'section'
    const count = counts.get(slug) ?? 0
    counts.set(slug, count + 1)
    const id = count ? `${slug}-${count}` : slug
    token.attrSet('id', id)
    if (token.tag === 'h2') headings.push({ id, title })
    return renderer.renderToken(tokens, index, options)
  }
  md.renderer.rules.link_open = (tokens, index, options, env, renderer) => {
    const token = tokens[index]!
    const href = rewriteLink(token.attrGet('href') ?? '', path, sources)
    token.attrSet('href', href)
    if (/^https?:\/\//.test(href)) { token.attrSet('target', '_blank'); token.attrSet('rel', 'noopener noreferrer') }
    return renderer.renderToken(tokens, index, options)
  }
  md.renderer.rules.fence = (tokens, index) => {
    const token = tokens[index]!
    const language = token.info.trim().split(/\s+/)[0] || 'text'
    const code = hljs.getLanguage(language) ? hljs.highlight(token.content, { language, ignoreIllegals: true }).value : escapeHtml(token.content)
    return `<div class="codeblock"><div class="code-toolbar"><span>${escapeHtml(language)}</span><button type="button" data-action="copy-code" aria-label="复制代码">复制</button></div><pre><code>${code}</code></pre></div>`
  }
  const clean = raw.replace(/^# .+\n/, '').replace(/^(?:上一章：|\[课程目录\]).*\n/gm, '')
  return { html: md.render(clean), headings }
}

export async function loadCourse(): Promise<Course> {
  const paths = [
    ...(await readdir(resolve(root, 'lib'))).filter(path => path.endsWith('.ts')).map(path => `lib/${path}`),
    'scripts/lesson.ts', 'scripts/lessons.ts', 'scripts/plugin-patch.ts',
  ]
  for (const [id] of lessons) {
    paths.push(...(await readdir(resolve(root, id))).filter(path => path.endsWith('.ts')).map(path => `${id}/${path}`))
  }
  const files: Record<string, SourceFile> = {}
  for (const path of paths) {
    const raw = await readFile(resolve(root, path), 'utf8')
    files[path] = { path, raw, html: hljs.highlight(raw, { language: 'typescript' }).value, lines: raw.trimEnd().split('\n').length }
  }
  function dependencies(path: string, found = new Set<string>()): string[] {
    if (found.has(path) || !files[path]) return [...found]
    found.add(path)
    for (const match of files[path]!.raw.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      if (match[1]?.startsWith('.')) dependencies(posix.normalize(posix.join(posix.dirname(path), match[1])), found)
    }
    return [...found]
  }
  const sourcePaths = new Set(paths)
  const course: Course = { lessons: [], files, guides: [] }
  for (const [id] of lessons) {
    const meta = metadata[id]
    if (!meta) throw new Error(`Missing website metadata: ${id}`)
    const raw = await readFile(resolve(root, id, 'README.md'), 'utf8')
    course.lessons.push({ ...meta, id, number: id.slice(1, 3), ...renderMarkdown(raw, `${id}/README.md`, sourcePaths),
      text: raw.replace(/[#*`>[\]]/g, ''), minutes: Math.max(3, Math.ceil(raw.length / 450)), files: dependencies(`${id}/code.ts`) })
  }
  for (const [path, id] of guidePaths) {
    const raw = await readFile(resolve(root, path), 'utf8')
    const title = raw.match(/^# (.+)/)?.[1] ?? id
    const guide: Guide = { id, title, ...renderMarkdown(raw, path, sourcePaths) }
    course.guides.push(guide)
  }
  return course
}
