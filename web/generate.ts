import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { loadCourse, prepareMarkdown, repository, root, siteBase } from './content.ts'

export async function generateSite() {
  const course = await loadCourse()
  const sources = new Set(Object.keys(course.files))
  const base = siteBase()
  const output = resolve(root, 'web/src/content/docs')
  async function page(path: string, frontmatter: Record<string, unknown>, body: string) {
    const dest = resolve(output, path)
    await mkdir(resolve(dest, '..'), { recursive: true })
    const header = Object.entries(frontmatter).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')
    await writeFile(dest, `---\n${header}\n---\n\n${body}\n`)
  }
  for (const lesson of course.lessons) {
    const path = `${lesson.id}/README.md`
    await page(`lessons/${lesson.id}.md`, {
      title: lesson.raw.match(/^# (.+)/)?.[1] ?? lesson.title,
      description: lesson.summary, lessonId: lesson.id, editUrl: `${repository}/edit/main/${path}`,
    }, prepareMarkdown(lesson.raw, path, sources, base))
  }
  for (const guide of course.guides) {
    await page(`guides/${guide.id}.md`, { title: guide.title, editUrl: `${repository}/edit/main/${guide.path}` },
      prepareMarkdown(guide.raw, guide.path, sources, base))
  }
  await page('index.mdx', {
    title: '从零理解 DeepSeek Harness',
    description: '12 个 TypeScript 课程，从最小 Agent 循环开始，逐步理解 DeepSeek Harness。',
    template: 'splash', editUrl: false,
    hero: {
      title: '从一个循环，\n理解 DeepSeek Harness。',
      tagline: '12 个循序渐进的 TypeScript 课程。读懂机制，查看源码，再亲手运行。',
      actions: [
        { text: '开始第一章', link: `${base}lessons/s01_agent_loop/`, icon: 'right-arrow' },
        { text: '本地运行', link: `${base}guides/running/`, variant: 'secondary' },
      ],
    },
  }, `import CourseOverview from '../../components/CourseOverview.astro'\n\n## 学习路线\n\n每一章只引入一个机制。建议按顺序阅读，再切换到源码与机制演示。离线示例不需要 API Key。\n\n<CourseOverview />\n\n## 开始之前\n\n- 熟悉 TypeScript、async / await 与 JSON。\n- 准备 Node.js 24.9.0 或以上版本，参见[运行与排错](${base}guides/running/)。\n- 了解[教学实现与官方 dsh 的差异](${base}guides/official-map/)。\n\n本课程与配套网站均采用 MIT 许可证。`)
  return [...course.lessons.map(lesson => `${lesson.id}/README.md`), ...course.guides.map(guide => guide.path), ...sources]
}
