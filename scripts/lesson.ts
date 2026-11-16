import { fileURLToPath } from 'node:url'
import { lessons } from './lessons.ts'

const selector = process.argv[2] ?? ''
if (!/^(?:[1-9]|1[0-2])$/.test(selector)) {
  console.log('Usage: npm run lesson -- <1-12> [--live [prompt]]')
  lessons.forEach(([folder, title], index) => console.log(`${String(index + 1).padStart(2, '0')}  ${folder}  ${title}`))
  process.exitCode = selector ? 1 : 0
} else {
  const number = Number(selector)
  const args = process.argv.slice(3)
  if (args.length && (!['1', '11'].includes(selector) || args[0] !== '--live')) {
    throw new Error('Only lessons 1 and 11 accept --live; other lessons are always offline')
  }
  const source = new URL(`../${lessons[number - 1]![0]}/code.ts`, import.meta.url)
  process.argv = [process.argv[0]!, fileURLToPath(source), ...args]
  const lesson = await import(source.href) as { main: () => Promise<void> }
  await lesson.main()
}
