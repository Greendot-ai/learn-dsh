import assert from 'node:assert/strict'
import { readFile, readdir, stat } from 'node:fs/promises'
import { resolve, relative } from 'node:path'
import { loadCourse, root, siteBase } from './content.ts'

const dist = resolve(root, 'web/dist')
const base = siteBase()
const course = await loadCourse()
const pages = ['index.html', ...course.lessons.map(lesson => `lessons/${lesson.id}/index.html`),
  ...course.guides.map(guide => `guides/${guide.id}/index.html`)]
for (const path of pages) {
  const html = await readFile(resolve(dist, path), 'utf8')
  assert.ok(html.includes('lang="zh-CN"'), `Missing Chinese language: ${path}`)
  assert.ok(html.includes('<h1'), `Missing pre-rendered content: ${path}`)
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const href = match[1]!.replaceAll('&amp;', '&')
    if (/^(?:data:|mailto:|tel:)/.test(href)) continue
    const url = new URL(href, `https://site.invalid${base}${path.replace(/index\.html$/, '')}`)
    if (url.origin !== 'https://site.invalid') continue
    assert.ok(url.pathname.startsWith(base), `Link escaped project base: ${href} in ${path}`)
    let target = resolve(dist, decodeURIComponent(url.pathname.slice(base.length)))
    if ((await stat(target)).isDirectory()) target = resolve(target, 'index.html')
    if (url.hash && target.endsWith('.html')) {
      const page = target === resolve(dist, path) ? html : await readFile(target, 'utf8')
      assert.ok(page.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), `Broken fragment: ${href} in ${path}`)
    }
  }
}
for (const lesson of course.lessons) {
  const html = await readFile(resolve(dist, `lessons/${lesson.id}/index.html`), 'utf8')
  assert.ok(html.includes('data-source-browser') && html.includes('data-mechanism'), `Missing course tools: ${lesson.id}`)
  assert.ok(html.includes('核心机制'), `Missing lesson prose: ${lesson.id}`)
}
const search = await readdir(resolve(dist, 'pagefind'))
assert.ok(search.includes('pagefind.js'), 'Missing Pagefind search index')
console.log(`Verified ${pages.length} pre-rendered pages, project-base assets, document fragments and search index in ${relative(root, dist)}.`)
