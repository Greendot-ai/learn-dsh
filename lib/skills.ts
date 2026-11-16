/** Explicit discovery and bounded loading. Skill text is reference data, not permission. */
import { z } from 'zod'
import { readFile } from 'node:fs/promises'
import type { Tool } from './tools.ts'
import { stringParameters } from './tools.ts'

export function skillTools(): Tool[] {
  const index = [{
    name: 'source-reading',
    description: 'Trace a dsh capability from plugin registration to its owning source files.',
    file: new URL('../skills/source-reading/SKILL.md', import.meta.url),
  }]
  return [
    {
      name: 'list_skills', description: 'List available skill names and when to load them.',
      mutates: false, parameters: { type: 'object', properties: {}, additionalProperties: false },
      async run(input) {
        z.object({}).strict().parse(input)
        return JSON.stringify(index.map(({ name, description }) => ({ name, description })))
      },
    },
    {
      name: 'load_skill', description: 'Load the instructions for a skill from list_skills.',
      mutates: false,
      parameters: stringParameters({ name: { type: 'string', description: 'An exact skill name.' } }),
      async run(input, signal) {
        const { name } = z.object({ name: z.string() }).strict().parse(input)
        const skill = index.find(item => item.name === name)
        if (!skill) throw new Error('Unknown skill; use list_skills')
        return readFile(skill.file, { encoding: 'utf8', signal })
      },
    },
  ]
}
