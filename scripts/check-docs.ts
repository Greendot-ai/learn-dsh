/** Source Markdown only; generated website links are checked by web/check-build.ts. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { lessons } from './lessons.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
// Include new source files, while respecting .gitignore for build output and caches.
const markdownFiles = new Set(execFileSync('git', [
  'ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', '*.md',
], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean))
let links = 0
for (const relative of markdownFiles) {
  const path = resolve(root, relative)
  const text = await readFile(path, 'utf8')
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const href = match[1]!
    if (/^(?:https?:|mailto:|#)/.test(href)) continue
    const target = decodeURIComponent(href.split('#')[0]!)
    if (!target) continue
    assert(await stat(resolve(dirname(path), target)), `${path}: missing link ${href}`)
    links++
  }
}
const readme = await readFile(resolve(root, 'README.md'), 'utf8')
for (const [folder] of lessons) {
  const lesson = await readFile(resolve(root, folder, 'README.md'), 'utf8')
  assert(readme.includes(`${folder}/README.md`), `Missing course index entry: ${folder}`)
  for (const section of ['要解决的问题', '核心机制', '运行', '动手练习', '与真实 dsh 的对应']) {
    assert(lesson.includes(`## ${section}`), `${folder}: missing ${section}`)
  }
}
console.log(`Checked ${lessons.length} lesson guides and ${links} local link targets.`)
