/** One-level delegation: independent messages, read-only tools, bounded returned text. */
import { z } from 'zod'
import type { Model } from './protocol.ts'
import { ToolRegistry, readFileTool, stringParameters } from './tools.ts'
import type { Tool } from './tools.ts'
import { runAgent } from './loop.ts'

export function delegateTool(root: string, modelFactory: () => Model): Tool {
  return {
    name: 'delegate_read', description: 'Ask a read-only helper to inspect workspace files and return a short summary.',
    mutates: false,
    parameters: stringParameters({ task: { type: 'string', description: 'A focused file-reading question.' } }),
    async run(input, signal) {
      const { task } = z.object({ task: z.string().min(1).max(1000) }).strict().parse(input)
      const tools = new ToolRegistry()
      tools.register(readFileTool(root))
      const { text } = await runAgent({ model: modelFactory(), tools, prompt: task, maxSteps: 4, signal })
      return text.slice(0, 2000)
    },
  }
}
