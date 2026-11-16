/** s01: model → tools → model. Run with --live only when you intend to call the API. */
import { ScriptedModel, answer, call } from '../lib/protocol.ts'
import type { Message, ToolSchema } from '../lib/protocol.ts'
import { liveModel } from '../lib/model.ts'

export async function main() {
  const live = process.argv.includes('--live')
  const model = live ? liveModel() : new ScriptedModel([call('greet', { name: 'dsh' }), answer('Hello, dsh!')])
  const messages: Message[] = [{ role: 'user', content: 'Use greet to greet dsh.' }]
  const tools: ToolSchema[] = [{ type: 'function', function: {
    name: 'greet', description: 'Greet a person.',
    parameters: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'], additionalProperties: false },
  } }]
  const signal = new AbortController().signal
  for (let step = 0; step < 8; step++) {
    const reply = await model.complete(messages, tools, signal)
    messages.push(reply)
    if (!reply.tool_calls?.length) { console.log(reply.content); return }
    for (const item of reply.tool_calls) {
      let content: string
      try {
        const args: unknown = JSON.parse(item.function.arguments)
        if (item.function.name !== 'greet' || typeof args !== 'object' || args === null ||
          !('name' in args) || typeof args.name !== 'string' || args.name.length > 80) {
          throw new Error('Expected greet({ name: string of at most 80 characters })')
        }
        content = `Hello, ${args.name}!`
      } catch (error) { content = `Error: ${error instanceof Error ? error.message : 'Invalid call'}` }
      messages.push({ role: 'tool', tool_call_id: item.id, content })
    }
  }
  throw new Error('Step budget exhausted')
}
if (import.meta.main) await main()
