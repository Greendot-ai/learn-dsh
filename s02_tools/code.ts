/** s02: add a handler, its schema, and a parser without changing the loop. */
import { fileURLToPath } from 'node:url'
import { ScriptedModel, answer, call } from '../lib/protocol.ts'
import { ToolRegistry, greetTool, readFileTool } from '../lib/tools.ts'
import { runAgent } from '../lib/loop.ts'

export async function main() {
  const tools = new ToolRegistry()
  tools.register(greetTool())
  tools.register(readFileTool(fileURLToPath(new URL('../fixtures/workspace', import.meta.url))))
  const model = new ScriptedModel([call('read_file', { path: 'hello.txt' }), answer('The workspace says: everything is a plugin.')])
  const { text } = await runAgent({ model, tools, prompt: 'Read hello.txt.' })
  console.log(model.requests[1]!.messages.at(-1)!.content?.trim())
  console.log(text)
}
if (import.meta.main) await main()
