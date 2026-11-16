/** A small Chat Completions vocabulary; this is not the dsh Session format. */
import { z } from 'zod'

export const toolCallSchema = z.object({
  id: z.string().min(1),
  type: z.literal('function'),
  function: z.object({ name: z.string().min(1), arguments: z.string() }),
})
export const assistantSchema = z.object({
  role: z.literal('assistant'),
  content: z.string().nullable(),
  reasoning_content: z.string().optional(),
  tool_calls: z.array(toolCallSchema).optional(),
})
export const messageSchema = z.discriminatedUnion('role', [
  z.object({ role: z.literal('system'), content: z.string() }),
  z.object({ role: z.literal('user'), content: z.string() }),
  assistantSchema,
  z.object({ role: z.literal('tool'), tool_call_id: z.string(), content: z.string() }),
])
export type ToolCall = z.infer<typeof toolCallSchema>
export type Assistant = z.infer<typeof assistantSchema>
export type Message = z.infer<typeof messageSchema>
export type ToolSchema = {
  type: 'function'
  function: { name: string; description: string; parameters: Record<string, unknown> }
}
export interface Model {
  complete(messages: Message[], tools: ToolSchema[], signal: AbortSignal): Promise<Assistant>
}

/** A script is deterministic model output, not an offline language model. */
export class ScriptedModel implements Model {
  private cursor = 0
  readonly requests: { messages: Message[]; tools: ToolSchema[] }[] = []
  private readonly replies: Assistant[]

  constructor(replies: Assistant[]) { this.replies = replies }

  async complete(messages: Message[], tools: ToolSchema[], signal: AbortSignal) {
    signal.throwIfAborted()
    this.requests.push(structuredClone({ messages, tools }))
    const reply = this.replies[this.cursor++]
    if (!reply) throw new Error('Script exhausted: add an explicit model reply')
    return structuredClone(reply)
  }
}

export function answer(content: string): Assistant { return { role: 'assistant', content } }
export function call(name: string, args: Record<string, unknown>, id = 'call-1'): Assistant {
  return {
    role: 'assistant', content: null,
    tool_calls: [{ id, type: 'function', function: { name, arguments: JSON.stringify(args) } }],
  }
}

/** Reject orphaned, duplicate, or unresolved calls before making another model request. */
export function validateTranscript(messages: Message[]) {
  const pending = new Set<string>()
  for (const message of messages) {
    if (message.role === 'tool') {
      if (!pending.delete(message.tool_call_id)) throw new Error('Unmatched tool result')
    } else {
      if (pending.size) throw new Error('Missing tool results')
      if (message.role === 'assistant') {
        for (const item of message.tool_calls ?? []) {
          if (pending.has(item.id)) throw new Error('Duplicate tool call id')
          pending.add(item.id)
        }
      }
    }
  }
  if (pending.size) throw new Error('Unresolved tool calls')
}
