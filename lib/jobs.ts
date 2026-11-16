/** Cooperative in-process jobs. Cancellation settles only after owned work exits. */
import { setTimeout as sleep } from 'node:timers/promises'
import { z } from 'zod'
import type { Tool } from './tools.ts'
import { stringParameters } from './tools.ts'

export type JobState = { id: string; status: 'running' | 'done' | 'cancelled' | 'failed'; output?: string }
type Job = { state: JobState; controller: AbortController; done: Promise<void> }
export class Jobs {
  private readonly entries = new Map<string, Job>()
  private closed = false
  private next = 0

  start(work: (signal: AbortSignal) => Promise<string>): string {
    if (this.closed) throw new Error('Jobs service is closed')
    const id = `job-${++this.next}`
    const controller = new AbortController()
    const state: JobState = { id, status: 'running' }
    const done = Promise.resolve().then(async () => {
      controller.signal.throwIfAborted()
      const output = await work(controller.signal)
      controller.signal.throwIfAborted()
      state.output = output.slice(0, 2000)
      state.status = 'done'
    }).catch((error: unknown) => {
      state.status = controller.signal.aborted ? 'cancelled' : 'failed'
      if (!controller.signal.aborted) state.output = error instanceof Error ? error.message.slice(0, 500) : 'Job failed'
    })
    this.entries.set(id, { state, controller, done })
    return id
  }

  status(id: string): JobState { return structuredClone(this.get(id).state) }
  async wait(id: string): Promise<JobState> { await this.get(id).done; return this.status(id) }
  async cancel(id: string): Promise<JobState> { this.get(id).controller.abort(); return this.wait(id) }
  async dispose() {
    this.closed = true
    for (const job of this.entries.values()) job.controller.abort()
    await Promise.all([...this.entries.values()].map(job => job.done))
  }
  private get(id: string): Job {
    const job = this.entries.get(id)
    if (!job) throw new Error(`Unknown job: ${id}`)
    return job
  }
}

export function jobTools(jobs: Jobs): Tool[] {
  return [
    {
      name: 'job_start', description: 'Start a background timer and return its job id.', mutates: false,
      parameters: stringParameters({ label: { type: 'string', description: 'Short label for the timer.' } }),
      async run(input) {
        const { label } = z.object({ label: z.string().min(1).max(80) }).strict().parse(input)
        const id = jobs.start(async signal => { await sleep(20, undefined, { signal }); return label })
        return JSON.stringify({ id })
      },
    },
    ...(['job_status', 'job_cancel'] as const).map(name => ({
      name, description: name === 'job_status' ? 'Read a background job state by id.' : 'Cancel a background job and wait for cleanup.',
      mutates: false,
      parameters: stringParameters({ id: { type: 'string', description: 'Job id returned by job_start.' } }),
      async run(input: unknown) {
        const { id } = z.object({ id: z.string() }).strict().parse(input)
        return JSON.stringify(name === 'job_status' ? jobs.status(id) : await jobs.cancel(id))
      },
    })),
  ]
}
