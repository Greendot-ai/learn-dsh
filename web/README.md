# Learn dsh 文档网站

网站直接采用 MIT 开源的 [Astro Starlight](https://github.com/withastro/starlight) 官方主题。页头、侧栏、页内目录、中文搜索、手机导航、深浅主题、卡片、标签页及代码块均来自 Starlight 与它集成的 Expressive Code；仅为阅读进度和机制演示的操作按钮补充少量样式。

## 开发与检查

从仓库根目录运行：

```sh
nvm use
npm ci --ignore-scripts
npm run web:dev
```

开发端口为 5173。课程 Markdown 和源码修改后会重新生成；搜索索引在生产构建时生成，开发模式显示 Starlight 的搜索提示。

```sh
npm run web:check
npm run web:preview
```

预览端口为 4173。`web:check` 验证内容与旧链接转换，执行 Astro/TypeScript 检查和生产构建，再检查全部静态页面的本地资源、页内锚点与搜索索引。CLI 课程继续使用 `npm run check` 验证。

## 内容来源

- `scripts/lessons.ts` 决定章节顺序；章节 README 和 `docs/` 是教程与指南的唯一正文来源。
- `content.ts` 递归收集 TypeScript 依赖，并通过 Markdown 语法树转换文档链接，保留代码示例原文。
- `generate.ts` 在 Astro 启动和构建时生成 `src/content/docs/` 和 `src/generated/course.json`。前者提供文档，后者提供构建时使用的课程与源码数据；均被 Git 忽略，请编辑原始课程，勿修改生成文件。
- `meta.ts` 提供章节简介与固定机制演示。网页不会调用模型、运行 Node 工具或要求 API Key。
- 章节使用 Starlight 的 Tabs 切换教程、源码与机制演示；源码使用原生 Tabs 和 Code 组件。
- 阅读进度沿用旧站的 localStorage 键。没有账号、统计或后端。

每页独立预渲染，正文和导航在关闭 JavaScript 时也可以阅读。搜索、标签页、代码复制、进度与演示需要 JavaScript。旧站 `#/lesson/...` 和 `#/guide/...` 分享链接会跳转到新地址，并保留视图、源码文件及章节锚点。

## GitHub Pages

[网站](https://greendot-ai.github.io/learn-dsh/)继续通过现有 GitHub Actions 工作流发布：PR 检查，合入 main 后部署。Pages Source 使用 **GitHub Actions**。

```sh
SITE_BASE=/learn-dsh/ npm run web:check
SITE_BASE=/learn-dsh/ npm run web:preview
```

默认本地基路径为 `/`。发布使用 `/learn-dsh/`；静态产物在 `web/dist/`，包括 Pagefind 搜索索引。修改部署位置时调整 `SITE_BASE` 和 `astro.config.ts` 的 `site`。

## 主题来源

比较过 [VitePress](https://vitepress.dev/)、[Docusaurus](https://docusaurus.io/) 与 [Starlight](https://starlight.astro.build/)。本项目使用 Starlight 的默认布局与组件，便于在静态 GitHub Pages 上保留中文课程和少量交互。主题与其 MIT 许可证见上游仓库，网站页脚保留 Starlight 标识。
