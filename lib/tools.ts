/** Teaching registry: a small schema projection, parser, handler, and execution policy. */
import { z } from 'zod'
import { readFile, realpath, stat } from 'node:fs/promises'
import { isAbsolute, relative, resolve } from 'node:path'
import type { ToolCall, ToolSchema } from './protocol.ts'

export interface Tool {
  name: string
  description: string
  parameters: Record<string, unknown>
  mutates: boolean
  run(args: unknown, signal: AbortSignal): Promise<string>
}
export type Guard = (tool: Tool) => void
export class ToolRegistry {
  private readonly entries = new Map<string, Tool>()
  private readonly guards = new Set<Guard>()

  register(tool: Tool): () => void {
    if (this.entries.has(tool.name)) throw new Error(`Duplicate tool: ${tool.name}`)
    this.entries.set(tool.name, tool)
    return () => { if (this.entries.get(tool.name) === tool) this.entries.delete(tool.name) }
  }

  guard(check: Guard): () => void {
    this.guards.add(check)
    return () => { this.guards.delete(check) }
  }

  schemas(): ToolSchema[] {
    return [...this.entries.values()].map(({ name, description, parameters }) => ({
      type: 'function', function: { name, description, parameters },
    }))
  }

  async execute(call: ToolCall, signal: AbortSignal): Promise<string> {
    signal.throwIfAborted()
    try {
      const tool = this.entries.get(call.function.name)
      if (!tool) throw new Error(`Unknown tool: ${call.function.name}`)
      for (const guard of this.guards) guard(tool)
      const args: unknown = JSON.parse(call.function.arguments)
      const result = await tool.run(args, signal)
      signal.throwIfAborted()
      // Return an explicit error instead of silently truncating JSON or skill instructions.
      if (result.length > 8000) throw new Error('Result exceeds 8000 characters; request a smaller result')
      return result
    } catch (error) {
      signal.throwIfAborted()
      return JSON.stringify({ error: error instanceof Error ? error.message.slice(0, 500) : 'Tool failed' })
    }
  }
}

export const stringParameters = (properties: Record<string, { type: 'string'; description: string }>) => ({
  type: 'object', properties, required: Object.keys(properties), additionalProperties: false,
})

export function greetTool(): Tool {
  return {
    name: 'greet', description: 'Greet a person by name.', mutates: false,
    parameters: stringParameters({ name: { type: 'string', description: 'Person to greet.' } }),
    async run(input, signal) {
      signal.throwIfAborted()
      const { name } = z.object({ name: z.string().min(1).max(80) }).strict().parse(input)
      return `Hello, ${name}!`
    },
  }
}

/** For a private teaching directory only: realpath checks do not prevent filesystem races. */
export function readFileTool(root: string): Tool {
  return {
    name: 'read_file', description: 'Read a UTF-8 file in the lesson workspace (up to 8000 bytes).',
    mutates: false,
    parameters: stringParameters({ path: { type: 'string', description: 'Path relative to the workspace.' } }),
    async run(input, signal) {
      const { path } = z.object({ path: z.string().min(1).max(500) }).strict().parse(input)
      if (isAbsolute(path)) throw new Error('Expected a workspace-relative path')
      const base = await realpath(root)
      const target = await realpath(resolve(base, path))
      const rel = relative(base, target)
      if (rel === '..' || rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(rel)) {
        throw new Error('Path is outside the workspace')
      }
      const info = await stat(target)
      if (!info.isFile() || info.size > 8000) throw new Error('Expected a regular file of at most 8000 bytes')
      return readFile(target, { encoding: 'utf8', signal })
    },
  }
}

export const readOnly: Guard = (tool) => {
  if (tool.mutates) throw new Error(`Read-only policy denied ${tool.name}`)
}
