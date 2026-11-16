/** s06: save, validate, replay, then continue the same conversation. */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Session } from '../lib/session.ts'
import { ScriptedModel, answer, call } from '../lib/protocol.ts'
import { ToolRegistry, greetTool } from '../lib/tools.ts'
import { runAgent } from '../lib/loop.ts'

export async function main() {
  const directory = await mkdtemp(join(tmpdir(), 'learn-dsh-'))
  const path = join(directory, 'session.jsonl')
  try {
    const tools = new ToolRegistry()
    tools.register(greetTool())
    const first = await runAgent({
      model: new ScriptedModel([call('greet', { name: 'dsh' }), answer('Hello, dsh!')]),
      tools, prompt: 'Greet dsh.',
    })
    await first.session.save(path)
    const session = await Session.load(path)
    console.log('replayed messages:', session.messages().length)
    const result = await runAgent({ model: new ScriptedModel([answer('We greeted dsh.')]), tools, session, prompt: 'What did we do?' })
    console.log(result.text)
  } finally { await rm(directory, { recursive: true, force: true }) }
}
if (import.meta.main) await main()
