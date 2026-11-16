/** s09: the parent receives a summary; the child owns its separate transcript. */
import { fileURLToPath } from 'node:url'
import { ScriptedModel, answer, call } from '../lib/protocol.ts'
import { ToolRegistry } from '../lib/tools.ts'
import { delegateTool } from '../lib/subagent.ts'
import { runAgent } from '../lib/loop.ts'

export async function main() {
  const child = new ScriptedModel([call('read_file', { path: 'hello.txt' }), answer('hello.txt describes the plugin architecture.')])
  const tools = new ToolRegistry()
  tools.register(delegateTool(fileURLToPath(new URL('../fixtures/workspace', import.meta.url)), () => child))
  const parent = new ScriptedModel([call('delegate_read', { task: 'Read hello.txt and summarize.' }), answer('Helper: everything is a plugin.')])
  console.log((await runAgent({ model: parent, tools, prompt: 'Ask a helper to inspect hello.txt.' })).text)
  console.log('child tools:', child.requests[0]!.tools.map(tool => tool.function.name))
  console.log('parent sees child tool calls:', parent.requests[1]!.messages.some(message =>
    message.role === 'assistant' && message.tool_calls?.some(item => item.function.name === 'read_file')))
}
if (import.meta.main) await main()
