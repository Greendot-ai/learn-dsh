/** CLI overlays need an absolute module path; bundle-relative paths have other rules. */
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const output = new URL('../.learn-dsh/real-dsh.patch.yml', import.meta.url)
const plugin = fileURLToPath(new URL('../s12_real_dsh/greet-plugin.ts', import.meta.url))
await mkdir(new URL('.', output), { recursive: true })
await writeFile(output, `- insert:\n    - id: learn-dsh-greet\n      name: ${JSON.stringify(plugin)}\n`)
console.log(`Created ${fileURLToPath(output)}`)
