import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import { resolve } from 'node:path'
import { lessons } from '../scripts/lessons.ts'
import { metadata, stages } from './meta.ts'
import { root, siteBase } from './content.ts'
import { generateSite } from './generate.ts'

const watched = await generateSite()

export default defineConfig({
  site: 'https://greendot-ai.github.io',
  base: siteBase(),
  trailingSlash: 'always',
  integrations: [starlight({
    title: 'learn-dsh',
    description: '通过 12 章可运行的 TypeScript 示例，逐步理解 DeepSeek Harness 的循环、工具、插件与会话。',
    favicon: '/favicon.svg',
    defaultLocale: 'root',
    locales: { root: { label: '简体中文', lang: 'zh-CN' } },
    social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/Greendot-ai/learn-dsh' }],
    components: { MarkdownContent: './src/components/CourseContent.astro', Head: './src/components/Head.astro' },
    sidebar: [
      { label: '课程总览', link: '/' },
      ...stages.map((stage, index) => ({
        label: stage.name,
        items: lessons.filter(([id]) => metadata[id]?.stage === index).map(([id]) => ({
          label: `${id.slice(1, 3)} · ${metadata[id]!.title}`, slug: `lessons/${id}`,
        })),
      })),
      { label: '参考指南', items: [
        { label: '运行与排错', slug: 'guides/running' },
        { label: '架构总览', slug: 'guides/architecture' },
        { label: '官方源码对应', slug: 'guides/official-map' },
      ] },
    ],
    expressiveCode: { defaultProps: { wrap: false } },
  }), {
    name: 'course-markdown-sync',
    hooks: {
      'astro:server:setup': ({ server }) => {
        const inputs = new Set(watched.map(path => resolve(root, path)))
        server.watcher.add([...inputs])
        let pending = Promise.resolve<string[]>([])
        server.watcher.on('change', path => {
          if (inputs.has(path)) pending = pending.then(() => generateSite()).catch(error => {
            server.config.logger.error(String(error)); return []
          })
        })
      },
    },
  }],
})
