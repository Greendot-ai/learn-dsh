/** The loop knows a model and a tool registry; plugins compose their implementations. */
import { assistantSchema, validateTranscript } from './protocol.ts'
import type { Message, Model } from './protocol.ts'
import { ToolRegistry } from './tools.ts'
import { Session } from './session.ts'

export async function runAgent(options: {
  model: Model; tools: ToolRegistry; prompt: string; session?: Session
  system?: string; maxSteps?: number; signal?: AbortSignal
  project?: (messages: Message[]) => Message[]
}): Promise<{ text: string; session: Session }> {
  const session = options.session ?? new Session()
  const signal = options.signal ?? new AbortController().signal
  const maxSteps = options.maxSteps ?? 8
  if (!Number.isInteger(maxSteps) || maxSteps < 1) throw new Error('maxSteps must be a positive integer')
  if (!session.messages().length) session.append({ role: 'system', content: options.system ?? 'Use the available tools to answer the user.' })
  validateTranscript(session.messages())
  session.append({ role: 'user', content: options.prompt })

  for (let step = 0; step < maxSteps; step++) {
    signal.throwIfAborted()
    const messages = options.project ? options.project(session.messages()) : session.messages()
    validateTranscript(messages)
    const schemas = options.tools.schemas()
    session.request(messages, schemas)
    const reply = assistantSchema.parse(await options.model.complete(messages, schemas, signal))
    signal.throwIfAborted()
    const calls = reply.tool_calls ?? []
    if (new Set(calls.map(call => call.id)).size !== calls.length) throw new Error('Duplicate tool call id')
    session.append(reply)
    if (!calls.length) return { text: reply.content ?? '', session }
    for (const call of calls) {
      const content = await options.tools.execute(call, signal)
      session.append({ role: 'tool', tool_call_id: call.id, content })
    }
  }
  throw new Error(`Step budget exhausted (${maxSteps}); no final answer was produced`)
}
