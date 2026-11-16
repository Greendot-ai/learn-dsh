import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DeepSeekModel } from '../lib/model.ts'
import { call } from '../lib/protocol.ts'

test('DeepSeek adapter sends tool schemas and retains thinking fields for the next request', async () => {
  const model = new DeepSeekModel({ apiKey: 'test-only', baseURL: 'https://example.invalid/v1/', model: 'deepseek-chat',
    async fetch(url, init) {
      assert.equal(url, 'https://example.invalid/v1/chat/completions')
      const body = JSON.parse(String(init!.body))
      assert.equal(body.model, 'deepseek-chat')
      assert.equal(body.stream, false)
      assert.equal(body.tools[0].function.name, 'greet')
      assert.equal(init!.redirect, 'error')
      return Response.json({ choices: [{ finish_reason: 'tool_calls', message: {
        ...call('greet', { name: 'dsh' }), reasoning_content: 'A test reasoning field.',
      } }] })
    },
  })
  const reply = await model.complete([{ role: 'user', content: 'hello' }], [
    { type: 'function', function: { name: 'greet', description: '', parameters: {} } },
  ], new AbortController().signal)
  assert.equal(reply.reasoning_content, 'A test reasoning field.')
  assert.equal(reply.tool_calls![0]!.function.name, 'greet')
})

test('DeepSeek adapter fails explicitly for partial output, invalid envelopes, and HTTP errors', async () => {
  for (const response of [
    () => Response.json({ choices: [{ finish_reason: 'length', message: { role: 'assistant', content: 'partial' } }] }),
    () => Response.json({ choices: [] }),
    () => new Response('no', { status: 401 }),
  ]) {
    const model = new DeepSeekModel({ apiKey: 'test-only', baseURL: 'https://example.invalid', model: 'deepseek-chat',
      async fetch() { return response() },
    })
    await assert.rejects(model.complete([], [], new AbortController().signal))
  }
  assert.throws(() => new DeepSeekModel({ apiKey: '', baseURL: 'https://example.invalid', model: 'x' }), /API_KEY/)
  assert.throws(() => new DeepSeekModel({ apiKey: 'test-only', baseURL: 'http://example.invalid', model: 'x' }), /HTTPS/)
})
