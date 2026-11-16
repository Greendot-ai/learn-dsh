/** s05: execution enforces policy even for a direct, non-model call. */
import { ToolRegistry, readOnly } from '../lib/tools.ts'
import { call } from '../lib/protocol.ts'

export async function main() {
  const tools = new ToolRegistry()
  let writes = 0
  tools.register({
    name: 'write_note', description: 'Update a demonstration note counter.',
    parameters: { type: 'object', properties: {} }, mutates: true,
    async run() { writes++; return 'updated' },
  })
  tools.guard(readOnly)
  const invocation = call('write_note', {}).tool_calls![0]!
  console.log(await tools.execute(invocation, new AbortController().signal))
  console.log('writes:', writes)
}
if (import.meta.main) await main()
