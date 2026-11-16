/** s11: compose the teaching harness entirely through actual Cordis plugins. */
import { fileURLToPath } from 'node:url'
import { createHarness } from '../lib/plugins.ts'
import { ScriptedModel, answer, call } from '../lib/protocol.ts'
import { liveModel } from '../lib/model.ts'

export async function main() {
  const live = process.argv.includes('--live')
  const prompt = process.argv.slice(process.argv.indexOf('--live') + 1).join(' ')
  const ctx = await createHarness({
    root: fileURLToPath(new URL('../fixtures/workspace', import.meta.url)),
    model: live ? liveModel() : new ScriptedModel([
      call('read_file', { path: 'hello.txt' }, 'read-1'),
      call('list_skills', {}, 'skills-1'),
      call('load_skill', { name: 'source-reading' }, 'skill-1'),
      call('delegate_read', { task: 'Summarize hello.txt.' }, 'child-1'),
      call('job_start', { label: 'demo-index' }, 'job-1'),
      answer('Read a file, loaded a skill, delegated a read, and started a managed job.'),
    ]),
    childModel: () => live ? liveModel() : new ScriptedModel([
      call('read_file', { path: 'hello.txt' }), answer('The file describes dsh as an all-plugin harness.'),
    ]),
  })
  try {
    const result = await ctx.get('learnLoop')!.run(live && prompt ? prompt : 'Inspect hello.txt using the lesson tools.')
    console.log(live ? '[live]' : '[scripted demo]', result.text)
    console.log('recorded model requests:', result.session.events().filter(event => event.data.type === 'request').length)
  } finally { await ctx.fiber.dispose() }
}
if (import.meta.main) await main()
