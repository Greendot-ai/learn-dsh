/** Local relative targets only: external upstream links are deliberately not fetched in CI. */
import assert from 'node:assert/strict'
import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { lessons } from './lessons.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
async function markdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.filter(entry => !['node_modules', '.git'].includes(entry.name)).map(async entry => {
    const path = resolve(directory, entry.name)
    return entry.isDirectory() ? markdownFiles(path) : entry.name.endsWith('.md') ? [path] : []
  }))
  return files.flat()
}
let links = 0
for (const path of await markdownFiles(root)) {
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
