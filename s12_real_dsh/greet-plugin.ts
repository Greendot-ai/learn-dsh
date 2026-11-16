/** A real dsh plugin, using the official tool schema and registry rather than lib/tools.ts. */
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'learn-dsh-greet'
export const inject = ['tools']

export function apply(ctx: Context) {
  ctx.tools.register(defineTool({
    name: 'learn_dsh_greet',
    description: 'Greet a person by name.',
    parameters: { name: { type: 'string', required: true, description: 'Person to greet.' } },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args, exec) {
      exec.signal.throwIfAborted()
      return `Hello, ${args.name}!`
    },
  }))
}
