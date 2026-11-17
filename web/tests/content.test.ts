import test from 'node:test'
import assert from 'node:assert/strict'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { visit } from 'unist-util-visit'
import { loadCourse, prepareMarkdown, rewriteLink, siteBase } from '../content.ts'
import { legacyTarget, readProgress } from '../src/state.ts'

test('all 12 lessons retain exact entry sources and recursively imported files', async () => {
  const course = await loadCourse()
  assert.equal(course.lessons.length, 12)
  assert.equal(course.guides.length, 3)
  for (const lesson of course.lessons) {
    assert.ok(lesson.files.includes(`${lesson.id}/code.ts`))
    assert.ok(lesson.steps.length >= 4)
    assert.ok(lesson.raw.startsWith('# '))
    for (const path of lesson.files) assert.ok(course.files[path]?.raw, `Missing source: ${path}`)
  }
})

test('Markdown rewrites document links without rewriting literal code', () => {
  const sources = new Set(['lib/loop.ts'])
  const raw = '# Title\n\n[chapter](../s02_tools/README.md#核心机制)\n\n[source](../lib/loop.ts)\n\n`[literal](../lib/loop.ts)`\n\n```md\n[literal](../lib/loop.ts)\n```\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))'
  const markdown = prepareMarkdown(raw, 's01_agent_loop/README.md', sources, '/learn-dsh/')
  const links: string[] = []
  visit(unified().use(remarkParse).parse(markdown), 'link', node => links.push(node.url))
  assert.ok(links.includes('/learn-dsh/lessons/s02_tools/#核心机制'))
  assert.ok(links.includes('/learn-dsh/lessons/s01_agent_loop/?view=source&file=lib%2Floop.ts'))
  assert.ok(markdown.includes('`[literal](../lib/loop.ts)`'))
  assert.ok(markdown.includes('```md\n[literal](../lib/loop.ts)\n```'))
  assert.ok(!markdown.includes('<script>'))
  assert.ok(!markdown.includes('javascript:'))
  assert.equal(rewriteLink('running.md', 'docs/architecture.md', sources), '/guides/running/')
  assert.equal(rewriteLink('#核心机制', 's01_agent_loop/README.md', sources), '#核心机制')
})

test('old hash links preserve lesson, source file, mechanism, guide and heading', () => {
  assert.equal(legacyTarget('#/lesson/s01_agent_loop?tab=source&file=lib%2Floop.ts', '/learn-dsh/'), '/learn-dsh/lessons/s01_agent_loop/?view=source&file=lib%2Floop.ts')
  assert.equal(legacyTarget('#/lesson/s02_tools?tab=mechanism', '/'), '/lessons/s02_tools/?view=mechanism')
  assert.equal(legacyTarget('#/guide/running?section=环境', '/'), '/guides/running/#%E7%8E%AF%E5%A2%83')
  assert.equal(legacyTarget('#/lesson/unknown', '/'), '/')
  assert.equal(legacyTarget('#核心机制', '/'), undefined)
  assert.equal(siteBase('learn-dsh'), '/learn-dsh/')
  assert.equal(siteBase('/'), '/')
  assert.equal(siteBase(''), '/')
})

test('existing saved progress rejects malformed data and unknown lessons', () => {
  assert.deepEqual([...readProgress('{broken', ['s01'])], [])
  assert.deepEqual([...readProgress('{"s01":true}', ['s01'])], [])
  assert.deepEqual([...readProgress('["s01","s01",42,"unknown"]', ['s01'])], ['s01'])
})
