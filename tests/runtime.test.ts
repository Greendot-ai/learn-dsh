import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ScriptedModel, answer, call, validateTranscript } from '../lib/protocol.ts'
import type { Model } from '../lib/protocol.ts'
import { ToolRegistry, greetTool, readFileTool, readOnly } from '../lib/tools.ts'
import { runAgent } from '../lib/loop.ts'
import { Session } from '../lib/session.ts'
import { keepRecentTurns } from '../lib/context.ts'
import { Jobs } from '../lib/jobs.ts'
import { setTimeout as sleep } from 'node:timers/promises'

const signal = () => new AbortController().signal
const invocation = (name: string, args: Record<string, unknown>) => call(name, args).tool_calls![0]!

test('multiple tool calls settle before the next request, with matching ids', async () => {
  const tools = new ToolRegistry()
  tools.register(greetTool())
  const model = new ScriptedModel([{
    role: 'assistant', content: null,
    tool_calls: [invocation('greet', { name: 'one' }), { ...invocation('greet', { name: 'two' }), id: 'call-2' }],
  }, answer('done')])
  const result = await runAgent({ model, tools, prompt: 'Greet both.' })
  assert.equal(result.text, 'done')
  assert.deepEqual(model.requests[1]!.messages.slice(-2), [
    { role: 'tool', tool_call_id: 'call-1', content: 'Hello, one!' },
    { role: 'tool', tool_call_id: 'call-2', content: 'Hello, two!' },
  ])
  validateTranscript(result.session.messages())
})

test('step budgets and cancellation stop further model or tool execution', async () => {
  const tools = new ToolRegistry()
  tools.register(greetTool())
  await assert.rejects(runAgent({ tools, prompt: 'loop', maxSteps: 1,
    model: new ScriptedModel([call('greet', { name: 'dsh' })]),
  }), /Step budget exhausted/)
  const controller = new AbortController()
  controller.abort()
  const model = new ScriptedModel([answer('must not run')])
  await assert.rejects(runAgent({ model, tools, prompt: 'stop', signal: controller.signal }), { name: 'AbortError' })
  assert.equal(model.requests.length, 0)
  const lateAbort = new AbortController()
  const cancellingModel: Model = { async complete() { lateAbort.abort(); return answer('late') } }
  await assert.rejects(runAgent({ model: cancellingModel, tools, prompt: 'stop', signal: lateAbort.signal }), { name: 'AbortError' })
})

test('tool errors are observable results; execution policy prevents the handler from running', async () => {
  const tools = new ToolRegistry()
  let executed = false
  tools.register(greetTool())
  tools.register({ name: 'write', description: '', parameters: {}, mutates: true,
    async run() { executed = true; return 'written' },
  })
  tools.guard(readOnly)
  assert.match(await tools.execute(invocation('write', {}), signal()), /Read-only policy denied/)
  assert.equal(executed, false)
  assert.match(await tools.execute(invocation('missing', {}), signal()), /Unknown tool/)
  assert.match(await tools.execute(invocation('greet', { name: 42 }), signal()), /error/)
  const malformed = invocation('greet', {})
  malformed.function.arguments = '{'
  assert.match(await tools.execute(malformed, signal()), /error/)
  tools.register({ name: 'large', description: '', parameters: {}, mutates: false, async run() { return 'x'.repeat(8001) } })
  assert.match(await tools.execute(invocation('large', {}), signal()), /exceeds 8000/)
})

test('tool registration disposal cannot remove a later replacement', () => {
  const tools = new ToolRegistry()
  const dispose = tools.register(greetTool())
  dispose()
  tools.register(greetTool())
  dispose()
  assert.equal(tools.schemas().length, 1)
})

test('workspace reads reject traversal, escaping symlinks, and large files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'learn-dsh-path-'))
  try {
    const workspace = join(directory, 'workspace')
    const { mkdir } = await import('node:fs/promises')
    await mkdir(workspace)
    await writeFile(join(directory, 'outside.txt'), 'private')
    await writeFile(join(workspace, 'good.txt'), 'lesson')
    await writeFile(join(workspace, 'large.txt'), 'x'.repeat(8001))
    await symlink(join(directory, 'outside.txt'), join(workspace, 'escape.txt'), 'file')
    const tool = readFileTool(workspace)
    assert.equal(await tool.run({ path: 'good.txt' }, signal()), 'lesson')
    await assert.rejects(tool.run({ path: '../outside.txt' }, signal()), /outside/)
    await assert.rejects(tool.run({ path: 'escape.txt' }, signal()), /outside/)
    await assert.rejects(tool.run({ path: 'large.txt' }, signal()), /8000/)
  } finally { await rm(directory, { recursive: true, force: true }) }
})

test('session snapshots replay the exact request and continue the conversation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'learn-dsh-log-'))
  try {
    const path = join(directory, 'session.jsonl')
    const tools = new ToolRegistry()
    tools.register(greetTool())
    const model = new ScriptedModel([call('greet', { name: 'dsh' }), answer('done')])
    const { session } = await runAgent({ tools, model, prompt: 'hello' })
    await session.save(path)
    const loaded = await Session.load(path)
    assert.deepEqual(loaded.events(), session.events())
    const request = loaded.events().filter(event => event.data.type === 'request').at(-1)!.data
    assert.equal(request.type, 'request')
    if (request.type === 'request') assert.deepEqual({ messages: request.messages, tools: request.tools }, model.requests.at(-1))
    const second = new ScriptedModel([answer('continued')])
    await runAgent({ tools, model: second, session: loaded, prompt: 'continue' })
    assert.deepEqual(second.requests[0]!.messages.slice(0, -1), session.messages())
    const text = await readFile(path, 'utf8')
    await writeFile(path, text.slice(0, -1))
    await assert.rejects(Session.load(path), /Incomplete log/)
    await writeFile(path, text.replace('"seq":0', '"seq":9'))
    await assert.rejects(Session.load(path), /Non-sequential/)
    await writeFile(path, text.replace('"version":1', '"version":99'))
    await assert.rejects(Session.load(path))
    const oversized = new Session()
    oversized.append({ role: 'user', content: 'x'.repeat(2_000_001) })
    await assert.rejects(oversized.save(path), /2 MB/)
  } finally { await rm(directory, { recursive: true, force: true }) }
})

test('context projection keeps complete recent turns and leaves the log intact', () => {
  const messages = [
    { role: 'system' as const, content: 'policy' }, { role: 'user' as const, content: 'old' }, answer('old answer'),
    { role: 'user' as const, content: 'new' }, call('greet', { name: 'dsh' }),
    { role: 'tool' as const, tool_call_id: 'call-1', content: 'Hello, dsh!' }, answer('done'),
  ]
  const projected = keepRecentTurns(messages, 1)
  assert.equal(messages.length, 7)
  assert.deepEqual(projected, [messages[0], ...messages.slice(3)])
  validateTranscript(projected)
  assert.throws(() => validateTranscript([call('greet', {})]), /Unresolved/)
  assert.throws(() => validateTranscript([{ role: 'tool', tool_call_id: 'orphan', content: '' }]), /Unmatched/)
})

test('jobs report failures and await cooperative cancellation when disposed', async () => {
  const jobs = new Jobs()
  let cleaned = false
  const running = jobs.start(async signal => {
    try { await sleep(60_000, undefined, { signal }); return 'late' }
    finally { cleaned = true }
  })
  const failed = jobs.start(async () => { throw new Error('index failed') })
  await jobs.wait(failed)
  assert.deepEqual(jobs.status(failed), { id: failed, status: 'failed', output: 'index failed' })
  // Let the first job enter its try/finally before disposal.
  await Promise.resolve()
  await jobs.dispose()
  assert.equal(cleaned, true)
  assert.equal(jobs.status(running).status, 'cancelled')
  assert.throws(() => jobs.start(async () => ''), /closed/)
})
