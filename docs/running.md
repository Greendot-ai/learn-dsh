# 运行与排错

浏览[在线课程](https://greendot-ai.github.io/learn-dsh/)无需安装软件，也不需要 API Key。以下步骤用于在本机运行示例或预览网站；除克隆与进入目录外，命令均在仓库根目录执行。

## 环境

使用 **Node.js ≥24.9.0**，可直接执行本仓库的 TypeScript，无需安装额外的运行器。推荐通过 `nvm install && nvm use` 使用 [.nvmrc](../.nvmrc) 固定的版本；没有 nvm 时，直接安装该版本的 Node.js 即可。

```sh
git clone https://github.com/Greendot-ai/learn-dsh.git
cd learn-dsh
npm ci --ignore-scripts
npm run lesson -- 1
```

看到 `Hello, dsh!` 即完成第一章的离线运行。`npm ci` 按锁文件安装依赖，`--ignore-scripts` 禁用安装过程中的生命周期脚本。依赖已包含第 12 章所需的官方 dsh 包，无需构建整个官方仓库。

## 命令

| 命令 | 行为 |
|---|---|
| `npm run lesson` | 显示章节列表 |
| `npm run lesson -- 6` | 离线执行第 6 章 |
| `npm run demo` | 离线执行全部章节 |
| `npm run web:dev` | 启动本地课程网站，访问终端显示的地址 |
| `npm run web:check` | 检查网站内容、类型、生产构建、静态链接与锚点 |
| `npm run lesson -- 1 --live` | 第 1 章真实问候调用 |
| `npm start -- "问题"` | 第 11 章真实任务，完成后退出 |
| `npm run typecheck` | 检查 TypeScript 类型 |
| `npm test` | 运行行为测试，包括官方 dsh 工具管线 |
| `npm run check:docs` | 检查课程章节和本地 Markdown 链接目标 |
| `npm run check` | 类型、测试、演示、文档检查依次执行 |

直接执行 `node s01_agent_loop/code.ts --live` 时，Node 不会替你读取 `.env`；请显式使用 `node --env-file-if-exists=.env s01_agent_loop/code.ts --live`，或者使用上表中的 npm 命令。

不加 `--live` 的课程示例使用固定脚本响应。`npm run demo` 始终离线运行，即使环境中已经设置了 API Key。网站的本地预览与 GitHub Pages 配置见[网站开发说明](../web/README.md)。

## API 配置

只有第 1、11 章支持 `--live`。需要观察真实模型行为时，复制 [.env.example](../.env.example) 为 `.env`，填入自己的密钥，再运行：

```sh
npm run lesson -- 1 --live
npm run lesson -- 11 --live "读取 hello.txt，说明 Harness 的作用"
```

一个用户任务可能触发多次模型请求；第 11 章的子代理也会使用真实 API。请求会发送消息与工具结果，并消耗 API 额度。

| 变量 | 默认值 | 说明 |
|---|---|---|
| `DEEPSEEK_API_KEY` | 无 | 只有 live 模式必需 |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | 必须是 HTTPS；适配器追加 `/chat/completions` |
| `DEEPSEEK_MODEL` | `deepseek-chat` | 需要支持 Chat Completions 工具调用的模型 |

`.env` 仅保存在本地，不要提交到仓库。修改端点后，请求和认证头会发往新端点，请使用自己信任的服务。

单次 HTTP 请求最长等待 60 秒；主循环默认最多请求模型 8 次，一次子代理循环最多 4 次。子代理的请求会额外发生，这些次数限制不能换算为固定费用上限。`max_tokens` 为 4096，适配器拒绝因长度或内容过滤而中断的响应，并保留可选的 `reasoning_content` 字段。当前使用非流式响应，不自动重试。

## 常见问题

- `node: command not found`：安装 Node；使用 nvm 时先加载 shell 配置再执行 `nvm use`。
- 不认识 `.ts`、不支持 `--env-file-if-exists`：检查 `node --version`，切换到支持的版本。
- `Set DEEPSEEK_API_KEY for --live`：检查 `.env` 是否在仓库根目录；只想学机制则移除 `--live`。
- `DeepSeek HTTP 401 / 402 / 429`：分别检查凭据、余额和速率限制；程序不会无限重试。
- `Step budget exhausted`：模型没有在预算内给出最终回答；检查工具结果与任务范围后缩小问题，不要直接移除预算。
- `Read-only policy denied`：请求被执行层拒绝，增加提示词不会绕过它。
- `Path is outside the workspace`：文件工具只读取演示工作区；第 11 章不是一个读取整个磁盘的助手。
- `Script exhausted`：你增加了工具交互，却没有在 `ScriptedModel` 中增加对应回复。
- 修改了教程，线上还没变化：线上页面需要提交代码并等待 GitHub Pages 部署；本地可用 `npm run web:dev` 预览。

## 持久化与中断

第 6 章使用临时目录演示快照，演示后删除。自行持久化时，把日志放在已忽略的 `.learn-dsh/`，不要提交真实对话。保存前校验工具调用配对并限制 2 MB；快照采用同目录临时文件加 rename，单写入者使用，不是逐事件 fsync 的持久 journal。

加载会拒绝未知格式版本、不连续序号、缺少末尾换行或未完成的工具交换；不猜测修复损坏日志。取消或工具执行中断可能让当前内存会话处于未完成状态，本课程不实现该状态的恢复：新建会话重新运行，保留原始日志用于诊断。

## 验证范围

`npm run check` 验证课程代码、离线行为和源文档链接，不调用模型 API，也不启动官方 dsh Web 应用。模型适配器使用模拟 HTTP 响应测试；真实端点的凭据、计费和在线模型行为需配置密钥后另行验证。

`npm run check:docs` 检查本地 Markdown 链接的文件目标；`npm run web:check` 进一步检查生成网站的页面、资源和锚点。两者都不检查远程链接可达性，也不代替浏览器交互检查。
