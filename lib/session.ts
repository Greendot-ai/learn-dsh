/** Append-only teaching events. Persistence is single-writer, separate from official dsh logs. */
import { readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { messageSchema, validateTranscript } from './protocol.ts'
import type { Message, ToolSchema } from './protocol.ts'

const eventSchema = z.object({
  version: z.literal(1), seq: z.number().int().nonnegative(),
  data: z.discriminatedUnion('type', [
    z.object({ type: z.literal('message'), message: messageSchema }),
    z.object({ type: z.literal('request'), messages: z.array(messageSchema), tools: z.array(z.object({
      type: z.literal('function'),
      function: z.object({ name: z.string(), description: z.string(), parameters: z.record(z.string(), z.unknown()) }),
    })) }),
  ]),
})
export type SessionEvent = z.infer<typeof eventSchema>

export class Session {
  private readonly log: SessionEvent[] = []

  append(message: Message) {
    this.log.push({ version: 1, seq: this.log.length, data: { type: 'message', message: structuredClone(message) } })
  }

  request(messages: Message[], tools: ToolSchema[]) {
    this.log.push({ version: 1, seq: this.log.length, data: structuredClone({ type: 'request', messages, tools }) })
  }

  events(): SessionEvent[] { return structuredClone(this.log) }
  messages(): Message[] {
    return this.log.flatMap(event => event.data.type === 'message' ? [structuredClone(event.data.message)] : [])
  }

  /** Atomic snapshot of the event sequence, not crash-safe per-event journaling. */
  async save(path: string) {
    validateTranscript(this.messages())
    const text = this.log.map(event => JSON.stringify(event)).join('\n') + '\n'
    if (Buffer.byteLength(text) > 2_000_000) throw new Error('Teaching log exceeds 2 MB')
    const temporary = `${path}.${randomUUID()}.tmp`
    try {
      await writeFile(temporary, text, { mode: 0o600, flag: 'wx' })
      await rename(temporary, path)
    } finally {
      await rm(temporary, { force: true })
    }
  }

  static async load(path: string): Promise<Session> {
    if ((await stat(path)).size > 2_000_000) throw new Error('Teaching log exceeds 2 MB')
    const text = await readFile(path, 'utf8')
    const session = new Session()
    if (!text.endsWith('\n')) throw new Error('Incomplete log: expected trailing newline')
    for (const line of text.trimEnd().split('\n').filter(Boolean)) {
      const event = eventSchema.parse(JSON.parse(line))
      if (event.seq !== session.log.length) throw new Error('Non-sequential event log')
      if (event.data.type === 'request') validateTranscript(event.data.messages)
      session.log.push(event)
    }
    validateTranscript(session.messages())
    return session
  }
}
