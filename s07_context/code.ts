/** s07: shorten the next request while preserving the durable event sequence. */
import { Session } from '../lib/session.ts'
import { keepRecentTurns } from '../lib/context.ts'
import { answer, call } from '../lib/protocol.ts'

export async function main() {
  const session = new Session()
  session.append({ role: 'system', content: 'Read-only assistant.' })
  session.append({ role: 'user', content: 'An older question.' })
  session.append(answer('An older answer.'))
  session.append({ role: 'user', content: 'Greet dsh.' })
  session.append(call('greet', { name: 'dsh' }))
  session.append({ role: 'tool', tool_call_id: 'call-1', content: 'Hello, dsh!' })
  session.append(answer('Hello, dsh!'))
  const projected = keepRecentTurns(session.messages(), 1)
  console.log('log messages:', session.messages().length, 'next request messages:', projected.length)
  console.log('roles:', projected.map(message => message.role).join(' → '))
}
if (import.meta.main) await main()
