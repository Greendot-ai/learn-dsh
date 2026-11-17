import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { loadCourse, root } from './content.ts'

export default defineConfig({
  root: resolve(root, 'web'),
  base: process.env.SITE_BASE || '/',
  plugins: [{
    name: 'course-content',
    resolveId(id) { if (id === 'virtual:course') return '\0virtual:course' },
    async load(id) {
      if (id !== '\0virtual:course') return
      const course = await loadCourse()
      for (const path of ['README.md', 'scripts/lessons.ts', ...Object.keys(course.files)]) this.addWatchFile(resolve(root, path))
      for (const lesson of course.lessons) this.addWatchFile(resolve(root, lesson.id, 'README.md'))
      for (const name of ['running', 'architecture', 'official-map']) this.addWatchFile(resolve(root, 'docs', `${name}.md`))
      return `export default ${JSON.stringify(course)}`
    },
    handleHotUpdate(context) {
      const module = context.server.moduleGraph.getModuleById('\0virtual:course')
      if (!module || !/\.(?:md|ts)$/.test(context.file)) return
      context.server.moduleGraph.invalidateModule(module)
      context.server.ws.send({ type: 'full-reload' })
    },
  }],
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 700 },
})
