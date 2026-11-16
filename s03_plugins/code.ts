/** s03: the actual Cordis fiber owns and removes a teaching tool registration. */
import { Context } from '@deepseek-ai/cordis'
import { LearnTools } from '../lib/plugins.ts'
import { greetTool } from '../lib/tools.ts'

export async function main() {
  const ctx = new Context()
  try {
    await ctx.plugin(LearnTools)
    const fiber = await ctx.plugin({
      name: 'greeting', inject: ['learnTools'],
      apply(owner: Context) { owner.effect(() => owner.learnTools.registry.register(greetTool())) },
    })
    console.log('mounted:', ctx.get('learnTools')!.registry.schemas().map(tool => tool.function.name))
    await fiber.dispose()
    console.log('unloaded:', ctx.get('learnTools')!.registry.schemas())
  } finally { await ctx.fiber.dispose() }
}
if (import.meta.main) await main()
