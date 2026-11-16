/** Optional non-streaming adapter for DeepSeek's Chat Completions API. */
import { z } from 'zod'
import { assistantSchema } from './protocol.ts'
import type { Model, Message, ToolSchema } from './protocol.ts'

const responseSchema = z.object({
  choices: z.array(z.object({
    message: assistantSchema,
    finish_reason: z.enum(['stop', 'tool_calls', 'length', 'content_filter', 'insufficient_system_resource']),
  })).min(1),
})

export class DeepSeekModel implements Model {
  private readonly key: string
  private readonly baseURL: string
  private readonly model: string
  private readonly request: typeof fetch

  constructor(options: { apiKey: string; baseURL: string; model: string; fetch?: typeof fetch }) {
    if (!options.apiKey.trim()) throw new Error('Set DEEPSEEK_API_KEY for --live')
    const url = new URL(options.baseURL)
    if (url.protocol !== 'https:') throw new Error('DEEPSEEK_BASE_URL must use HTTPS')
    this.key = options.apiKey
    this.baseURL = options.baseURL.replace(/\/$/, '')
    this.model = options.model
    this.request = options.fetch ?? fetch
  }

  async complete(messages: Message[], tools: ToolSchema[], signal: AbortSignal) {
    const response = await this.request(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model, messages, stream: false, max_tokens: 4096,
        ...(tools.length ? { tools } : {}),
      }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(60_000)]),
      redirect: 'error',
    })
    if (!response.ok) throw new Error(`DeepSeek HTTP ${response.status}; check account and endpoint`)
    const { choices } = responseSchema.parse(await response.json())
    const choice = choices[0]!
    if (!['stop', 'tool_calls'].includes(choice.finish_reason)) {
      throw new Error(`Incomplete model response: ${choice.finish_reason}`)
    }
    // Preserve reasoning_content on tool turns when a thinking model supplies it.
    return choice.message
  }
}

export function liveModel(): Model {
  return new DeepSeekModel({
    apiKey: process.env.DEEPSEEK_API_KEY ?? '',
    baseURL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
  })
}
