/** s08: list metadata first; load the named instructions only when needed. */
import { ToolRegistry } from '../lib/tools.ts'
import { skillTools } from '../lib/skills.ts'
import { call } from '../lib/protocol.ts'

export async function main() {
  const tools = new ToolRegistry()
  for (const tool of skillTools()) tools.register(tool)
  const signal = new AbortController().signal
  console.log(await tools.execute(call('list_skills', {}).tool_calls![0]!, signal))
  const text = await tools.execute(call('load_skill', { name: 'source-reading' }).tool_calls![0]!, signal)
  console.log(text.trim())
}
if (import.meta.main) await main()
