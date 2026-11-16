/** Whole-turn projection: discard old input turns, never half of a tool exchange. */
import type { Message } from './protocol.ts'
import { validateTranscript } from './protocol.ts'

export function keepRecentTurns(messages: Message[], keep = 2): Message[] {
  if (!Number.isInteger(keep) || keep < 1) throw new Error('keep must be a positive integer')
  validateTranscript(messages)
  const system: Message[] = []
  const turns: Message[][] = []
  for (const message of messages) {
    if (message.role === 'system') { system.push(message); continue }
    if (message.role === 'user') turns.push([])
    const turn = turns.at(-1)
    if (!turn) throw new Error('Expected user input before a reply')
    turn.push(message)
  }
  return structuredClone([...system, ...turns.slice(-keep).flat()])
}
