import { lessons } from './lessons.ts'

// Never inherit --live from command-line arguments when running the full course.
process.argv = process.argv.slice(0, 2)
for (const [folder, title] of lessons) {
  console.log(`\n${folder}: ${title}`)
  const lesson = await import(new URL(`../${folder}/code.ts`, import.meta.url).href) as { main: () => Promise<void> }
  await lesson.main()
}
console.log(`\n${lessons.length} offline lessons completed.`)
