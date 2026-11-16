/** s04: injection determines readiness; waterfall composes around a result. */
import { Context } from '@deepseek-ai/cordis'
import { LearnTools } from '../lib/plugins.ts'

export async function main() {
  const ctx = new Context()
  let active = false
  try {
    const consumer = ctx.plugin({
      name: 'consumer', inject: ['learnTools'],
      apply(owner: Context) {
        active = true
        owner.effect(() => () => { active = false })
        owner.on('learn/format', async (_text, next) => (await next()).toUpperCase())
      },
    })
    await consumer
    console.log('before provider:', active)
    const provider = await ctx.plugin(LearnTools)
    await consumer.await()
    console.log('after provider:', active)
    console.log(await ctx.waterfall('learn/format', 'dsh', async () => 'hello, dsh'))
    await provider.dispose()
    await consumer.await()
    console.log('provider unloaded:', active)
  } finally { await ctx.fiber.dispose() }
}
if (import.meta.main) await main()
