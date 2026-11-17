# Learn dsh 配套网站

中文静态学习网站：课程总览、12 章教程、源码浏览、逐步机制演示、全文搜索、本地阅读进度与深浅主题。设计借鉴 [learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) 的课程导航与阅读方式，页面与交互为本仓库独立实现。

## 本地开发

从仓库根目录运行，使用与 CLI 课程相同的 Node 版本和锁文件：

```sh
nvm use
npm ci --ignore-scripts
npm run web:dev
```

默认开发地址为 `http://localhost:5173`。生产构建与预览：

```sh
npm run web:check
npm run web:preview
```

`web:check` 检查内容生成、站内章节/锚点/源码链接、Markdown HTML 转义与进度解析，再运行网站 TypeScript 检查及 Vite 构建。原有 `npm run check` 继续验证 CLI 课程。

## 内容来源

- [课程列表](../scripts/lessons.ts)决定章节顺序。
- 章节 README、入口源码与 `lib/` 在构建时读取；页面不维护教程副本。
- [课程元数据](meta.ts)提供阶段、简述和固定教学演示；源码页会列出入口文件及本地导入依赖。
- [内容生成器](content.ts)渲染 Markdown、语法高亮，并把本地教程、指南和源码链接转换为站内导航。
- 所有模型请求仍在 CLI 中执行。网页演示是固定数据的机制示意，不会调用 API、运行 Node 工具或要求输入密钥。
- 阅读进度与主题只保存在当前浏览器的 localStorage，没有账号、统计或后台服务。

使用哈希路由，章节分享链接可直接刷新；部署在项目子路径时不依赖服务器重写规则。网站无需外部字体或运行时 CDN。

## GitHub Pages

网站发布工作流在 PR 上验证构建，合入 main 后部署。首次发布前，仓库管理员须在 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。参见 [GitHub 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

此仓库的 Pages 基路径在工作流中设为 `/learn-dsh/`；本地默认 `/`。可复现子路径构建：

```sh
SITE_BASE=/learn-dsh/ npm run web:build
SITE_BASE=/learn-dsh/ npm run web:preview
```

构建产物在 `web/dist/`，也可部署到任意静态主机。修改项目名或自定义域名时，调整 `SITE_BASE` 后重新构建。

## 无障碍与交互

提供跳过导航、章节/视图链接、系统原生搜索对话框、键盘焦点样式与减少动画偏好支持。按 `Ctrl/Cmd+K` 搜索，按 `Esc` 关闭。移动端通过菜单按钮打开课程目录。站内链接、代码复制、自动播放与阅读进度仍需浏览器 JavaScript；无脚本时提供 GitHub 阅读入口。
