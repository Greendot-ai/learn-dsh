import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import { createHarness, LearnTools } from '../lib/plugins.ts'
import { ScriptedModel, answer, call } from '../lib/protocol.ts'
import { delegateTool } from '../lib/subagent.ts'
import { main as officialDshExample } from '../s12_real_dsh/code.ts'

const root = fileURLToPath(new URL('../fixtures/workspace', import.meta.url))

test('Cordis unloads a dependent consumer and its listener when its service goes away', async () => {
  const ctx = new Context()
  let observed = 0
  try {
    const consumer = ctx.plugin({ inject: ['learnTools'], apply(owner: Context) {
      owner.on('learn/turn', () => { observed++ })
    } })
    await consumer
    ctx.emit('learn/turn', 'pending')
    assert.equal(observed, 0)
    const service = await ctx.plugin(LearnTools)
    await consumer.await()
    ctx.emit('learn/turn', 'ready')
    assert.equal(observed, 1)
    await service.dispose()
    await consumer.await()
    ctx.emit('learn/turn', 'unloaded')
    assert.equal(observed, 1)
  } finally { await ctx.fiber.dispose() }
})

test('composed teaching harness discovers tools, emits output, and unregisters capabilities', async () => {
  const model = new ScriptedModel([call('greet', { name: 'dsh' }), answer('Hello, dsh!')])
  const ctx = await createHarness({ model, root, childModel: () => new ScriptedModel([answer('child')]) })
  const registry = ctx.get('learnTools')!.registry
  let observed = ''
  try {
    ctx.on('learn/turn', text => { observed = text })
    await ctx.get('learnLoop')!.run('Greet dsh.')
    assert.equal(observed, 'Hello, dsh!')
    assert(model.requests[0]!.tools.some(tool => tool.function.name === 'load_skill'))
    assert(model.requests[0]!.tools.some(tool => tool.function.name === 'delegate_read'))
    assert(model.requests[0]!.tools.some(tool => tool.function.name === 'job_start'))
  } finally { await ctx.fiber.dispose() }
  assert.equal(registry.schemas().length, 0)
})

test('delegated reader has a separate transcript and cannot recursively delegate', async () => {
  const child = new ScriptedModel([call('read_file', { path: 'hello.txt' }), answer('plugin architecture')])
  const tool = delegateTool(root, () => child)
  assert.equal(await tool.run({ task: 'Read hello.txt' }, new AbortController().signal), 'plugin architecture')
  assert.deepEqual(child.requests[0]!.tools.map(tool => tool.function.name), ['read_file'])
  assert.equal(child.requests[0]!.messages.at(-1)!.content, 'Read hello.txt')
})

test('official dsh registry executes the plugin and removes it on unload', officialDshExample)
