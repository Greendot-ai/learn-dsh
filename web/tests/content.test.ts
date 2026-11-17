import test from 'node:test'
import assert from 'node:assert/strict'
import { loadCourse, renderMarkdown, rewriteLink } from '../content.ts'
import { parseRoute, readProgress } from '../src/state.ts'

test('the site publishes all course guides and exact source files with resolvable internal links', async () => {
  const course = await loadCourse()
  assert.equal(course.lessons.length, 12)
  assert.equal(course.guides.length, 3)
  for (const lesson of course.lessons) {
    assert.ok(lesson.files.includes(`${lesson.id}/code.ts`))
    assert.ok(lesson.steps.length >= 4)
    assert.equal(lesson.headings.length, 5)
    for (const path of lesson.files) assert.ok(course.files[path], `Missing source: ${path}`)
  }
  for (const page of [...course.lessons, ...course.guides]) {
    for (const match of page.html.matchAll(/href="(#[^"]+)"/g)) {
      const route = parseRoute(match[1]!.replaceAll('&amp;', '&'))
      if (route.kind === 'home') continue
      const target = route.kind === 'lesson' ? course.lessons.find(lesson => lesson.id === route.id) : course.guides.find(guide => guide.id === route.id)
      assert.ok(target, `Unresolved route: ${match[1]}`)
      const section = route.params.get('section')
      if (section) assert.ok(target.html.includes(`id="${section}"`), `Missing heading: ${match[1]}`)
      const file = route.params.get('file')
      if (file) assert.ok(course.files[file], `Missing linked source: ${file}`)
    }
  }
})

test('Markdown keeps fenced code literal and disables embedded executable HTML', () => {
  const page = renderMarkdown('# Title\n\n## Repeated heading\n<script>alert(1)</script>\n\n## Repeated heading\n\n```ts\nconst html = "<script>"\n```\n\n[bad](javascript:alert(1))', 's01_agent_loop/README.md', new Set())
  assert.ok(!page.html.includes('<script>'))
  assert.ok(!page.html.includes('href="javascript:'))
  assert.deepEqual(page.headings.map(heading => heading.id), ['repeated-heading', 'repeated-heading-1'])
  assert.ok(page.html.includes('&lt;script&gt;'))
  assert.equal(rewriteLink('../s02_tools/README.md#核心机制', 's01_agent_loop/README.md', new Set()), '#/lesson/s02_tools?section=%E6%A0%B8%E5%BF%83%E6%9C%BA%E5%88%B6')
  assert.equal(rewriteLink('../lib/loop.ts', 's02_tools/README.md', new Set(['lib/loop.ts'])), '#/lesson/s02_tools?tab=source&file=lib%2Floop.ts')
})

test('saved progress rejects malformed data and drops unknown lessons', () => {
  assert.deepEqual([...readProgress('{broken', ['s01'])], [])
  assert.deepEqual([...readProgress('{"s01":true}', ['s01'])], [])
  assert.deepEqual([...readProgress('["s01","s01",42,"unknown"]', ['s01'])], ['s01'])
  assert.deepEqual(parseRoute('#/lesson/s01_agent_loop?tab=source&file=lib%2Floop.ts').params.get('file'), 'lib/loop.ts')
})
