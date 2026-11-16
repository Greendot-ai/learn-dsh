/** Real Cordis lifecycle around a deliberately small, separately named teaching runtime. */
import { Context, Service } from '@deepseek-ai/cordis'
import type { Model } from './protocol.ts'
import { ToolRegistry, greetTool, readFileTool, readOnly } from './tools.ts'
import { Session } from './session.ts'
import { runAgent } from './loop.ts'
import { keepRecentTurns } from './context.ts'
import { skillTools } from './skills.ts'
import { delegateTool } from './subagent.ts'
import { Jobs, jobTools } from './jobs.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    learnTools: LearnTools
    learnModel: LearnModel
    learnSession: LearnSession
    learnLoop: LearnLoop
  }
  interface Events {
    /** @mode emit — one notification after a complete teaching turn. */
    'learn/turn'(text: string): void
    /** @mode waterfall — intercept a teaching message and delegate with next(). */
    'learn/format'(text: string, next: () => Promise<string>): Promise<string>
  }
}

export class LearnTools extends Service {
  readonly registry = new ToolRegistry()
  constructor(ctx: Context) { super(ctx, 'learnTools') }
}
export class LearnModel extends Service {
  readonly provider: Model
  constructor(ctx: Context, config: { model: Model }) {
    super(ctx, 'learnModel')
    this.provider = config.model
  }
}
export class LearnSession extends Service {
  readonly session = new Session()
  constructor(ctx: Context) { super(ctx, 'learnSession') }
}
export class LearnLoop extends Service {
  static inject = ['learnTools', 'learnModel', 'learnSession']
  constructor(ctx: Context) { super(ctx, 'learnLoop') }
  async run(prompt: string, signal?: AbortSignal) {
    const result = await runAgent({
      model: this.ctx.learnModel.provider, tools: this.ctx.learnTools.registry,
      session: this.ctx.learnSession.session, prompt, signal,
      project: messages => keepRecentTurns(messages, 2),
    })
    this.ctx.emit('learn/turn', result.text)
    return result
  }
}

export async function createHarness(config: { model: Model; root: string; childModel: () => Model }) {
  const ctx = new Context()
  try {
    // Consumers may be mounted first: inject keeps them pending until providers exist.
    const loop = ctx.plugin(LearnLoop)
    await ctx.plugin(LearnTools)
    await ctx.plugin(LearnSession)
    await ctx.plugin(LearnModel, { model: config.model })
    await loop
    await ctx.plugin({
      name: 'lesson-capabilities', inject: ['learnTools'],
      apply(owner: Context) {
        const registry = owner.learnTools.registry
        const jobs = new Jobs()
        owner.effect(() => () => jobs.dispose())
        owner.effect(() => registry.guard(readOnly))
        for (const tool of [greetTool(), readFileTool(config.root), ...skillTools(),
          delegateTool(config.root, config.childModel), ...jobTools(jobs)]) {
          owner.effect(() => registry.register(tool))
        }
      },
    })
    return ctx
  } catch (error) {
    await ctx.fiber.dispose()
    throw error
  }
}
