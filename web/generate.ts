import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { loadCourse, prepareMarkdown, repository, root, siteBase } from './content.ts'

export async function generateSite() {
  const course = await loadCourse()
  const sources = new Set(Object.keys(course.files))
  const base = siteBase()
  const output = resolve(root, 'web/src/content/docs')
  const data = resolve(root, 'web/src/generated')
  await mkdir(data, { recursive: true })
  await writeFile(resolve(data, 'course.json'), JSON.stringify(course))
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
  await page('404.md', { title: '未找到页面', template: 'splash', editUrl: false },
    `请检查链接地址，或[返回课程总览](${base})继续学习。`)
  await page('index.mdx', {
    title: '从零理解 DeepSeek Harness',
    description: '通过 12 章可运行的 TypeScript 示例，学习 Agent 循环、工具、插件和会话，再接入官方 DeepSeek Harness。',
    template: 'splash', editUrl: false,
    hero: {
      title: '从一个循环，\n理解 DeepSeek Harness。',
      tagline: '12 章可运行的 TypeScript 示例。从工具调用到插件组合，一步步理解 Agent 如何运行。',
      actions: [
        { text: '开始第一章', link: `${base}lessons/s01_agent_loop/`, icon: 'right-arrow' },
        { text: '查看运行指南', link: `${base}guides/running/`, variant: 'secondary' },
      ],
    },
  }, `import CourseOverview from '../../components/CourseOverview.astro'\n\n## 这门课学什么\n\n模型可以提出工具调用，但执行工具、传回结果、管理上下文和回收资源，都需要运行时来完成。Harness 就负责把这些环节组织起来。你将从一个最小循环开始，逐章加入工具、插件、会话和任务管理，最后用官方 dsh 包编写工具插件。\n\n## 学习路线\n\n每章围绕一个核心机制展开，建议从第 1 章依次学习。已有相关基础时，也可以直接选择章节查阅。\n\n<CourseOverview />\n\n## 怎样学习一章\n\n1. **阅读教程**：先理解本章要解决的问题，再预测示例的运行结果。\n2. **对照演示与源码**：用“机制演示”梳理步骤，再在“查看源码”中跟踪入口文件和共享模块。演示使用固定数据，不会执行代码。\n3. **本地运行并练习**：按本章命令运行示例，对照输出，再完成动手练习。阅读进度可手动标记，仅保存在当前浏览器。\n\n## 开始之前\n\n浏览课程和机制演示不需要安装软件或提供 API Key。本地运行需要 Node.js 24.9.0 或以上版本，具体步骤见[运行与排错](${base}guides/running/)。建议具备 JavaScript 基础，了解 TypeScript 的基本语法、async / await 和 JSON。\n\n第 1–11 章使用精简的教学运行时，第 3 章起使用 Cordis；第 12 章直接调用官方 dsh 工具管线。离线示例的模型响应由脚本预设，工具执行、会话回放与插件卸载则实际运行。各章的简化范围见[官方源码对应表](${base}guides/official-map/)。\n\n本课程是独立的开源教学项目，与 DeepSeek 官方无隶属关系。课程与配套网站均采用 MIT 许可证。`)
  return [...course.lessons.map(lesson => `${lesson.id}/README.md`), ...course.guides.map(guide => guide.path), ...sources]
}
