/** Keyless integration with official dsh services, native executor, and effect teardown. */
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import Tools from '@deepseek-ai/dsh-tools'
import * as NativeExecutor from '@deepseek-ai/dsh-tool-executor-native'
import { brandString } from '@deepseek-ai/dsh-brand'
import type { ToolCallId } from '@deepseek-ai/dsh-llm'
import * as Greet from './greet-plugin.ts'

export async function main() {
  const ctx = new Context()
  try {
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(Tools)
    await ctx.plugin(NativeExecutor)
    const fiber = await ctx.plugin(Greet)
    const tools = ctx.get('tools')!
    assert(tools.schemas().some(tool => tool.name === 'learn_dsh_greet'))
    const result = await tools.execute({
      calls: [{ type: 'tool-call', id: brandString<ToolCallId>('real-dsh-1'),
        name: 'learn_dsh_greet', arguments: JSON.stringify({ name: 'dsh' }) }],
      signal: new AbortController().signal,
    })
    assert.deepEqual(result.results[0]!.result.content, [{ type: 'text', text: 'Hello, dsh!' }])
    assert(!result.results[0]!.result.isError)
    console.log('official dsh pipeline:', JSON.stringify(result.results[0]!.result.content))
    await fiber.dispose()
    assert(!tools.schemas().some(tool => tool.name === 'learn_dsh_greet'))
    console.log('unloaded: tool removed from official registry')
  } finally { await ctx.fiber.dispose() }
}
if (import.meta.main) await main()
