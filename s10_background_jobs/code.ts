/** s10: a job id outlives the call that started work; disposal awaits cancellation. */
import { setTimeout as sleep } from 'node:timers/promises'
import { Jobs } from '../lib/jobs.ts'

export async function main() {
  const jobs = new Jobs()
  try {
    const completed = jobs.start(async signal => { await sleep(1, undefined, { signal }); return 'indexed 1 file' })
    console.log(await jobs.wait(completed))
    const cancelled = jobs.start(async signal => { await sleep(60_000, undefined, { signal }); return 'unreachable' })
    console.log(await jobs.cancel(cancelled))
  } finally { await jobs.dispose() }
}
if (import.meta.main) await main()
