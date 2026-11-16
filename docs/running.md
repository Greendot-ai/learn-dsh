# 运行与排错

## 环境

Node.js ≥24.9.0 原生执行本仓库的可擦除 TypeScript 语法，不需要 `tsx`。推荐 `nvm install && nvm use`，版本由 [.nvmrc](../.nvmrc) 固定；没有 nvm 时直接安装对应 Node.js 版本即可。

克隆后从仓库根目录运行 `npm ci --ignore-scripts`。依赖包含官方 dsh 工具相关包，用于第 12 章；本课程不要求构建整个官方 monorepo。锁文件固定传递依赖，CI 安装时禁用生命周期脚本。

## 命令

| 命令 | 行为 |
|---|---|
| `npm run lesson` | 显示章节列表 |
| `npm run lesson -- 6` | 离线执行第 6 章 |
| `npm run demo` | 离线执行全部章节 |
| `npm run lesson -- 1 --live` | 第 1 章真实问候调用 |
| `npm start -- "问题"` | 第 11 章真实单轮任务 |
| `npm run typecheck` | 检查 TypeScript 类型 |
| `npm test` | 运行行为测试，包括官方 dsh 工具管线 |
| `npm run check:docs` | 检查课程章节和本地 Markdown 链接目标 |
| `npm run check` | 类型、测试、演示、文档检查依次执行 |

直接执行 `node s01_agent_loop/code.ts --live` 时，Node 不会替你读取 `.env`；请显式使用 `node --env-file-if-exists=.env s01_agent_loop/code.ts --live`，或者使用上表中的 npm 命令。

## API 配置

| 变量 | 默认值 | 说明 |
|---|---|---|
| `DEEPSEEK_API_KEY` | 无 | 只有 live 模式必需 |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | 必须是 HTTPS；适配器追加 `/chat/completions` |
| `DEEPSEEK_MODEL` | `deepseek-chat` | 需要支持 Chat Completions 工具调用的模型 |

按照 [.env.example](../.env.example) 创建本地 `.env`。本课程不获取、保存或代你申请密钥。修改端点意味着请求和认证头会发往该端点，请仅使用你信任的服务。

单次 HTTP 请求最长 60 秒，默认最多 8 次模型请求；子代理最多 4 次。`max_tokens` 为 4096；适配器拒绝因长度或内容过滤而中断的响应，不把截断文本当作最终答案。保留响应中的可选 `reasoning_content`，但不单独打印它。这里没有流式输出、重试、速率限制或对所有模型的兼容承诺。

## 常见问题

- `node: command not found`：安装 Node；使用 nvm 时先加载 shell 配置再执行 `nvm use`。
- 不认识 `.ts`、不支持 `--env-file-if-exists`：检查 `node --version`，切换到支持的版本。
- `Set DEEPSEEK_API_KEY for --live`：检查 `.env` 是否在仓库根目录；只想学机制则移除 `--live`。
- `DeepSeek HTTP 401 / 402 / 429`：分别检查凭据、余额和速率限制；程序不会无限重试。
- `Step budget exhausted`：模型没有在预算内给出最终回答；检查工具结果与任务范围后缩小问题，不要直接移除预算。
- `Read-only policy denied`：请求被执行层拒绝，增加提示词不会绕过它。
- `Path is outside the workspace`：文件工具只读取演示工作区；第 11 章不是一个读取整个磁盘的助手。
- `Script exhausted`：你增加了工具交互，却没有在 `ScriptedModel` 中增加对应回复。

## 持久化与中断

第 6 章使用临时目录演示快照，演示后删除。自行持久化时，把日志放在已忽略的 `.learn-dsh/`，不要提交真实对话。保存前校验工具调用配对并限制 2 MB；快照采用同目录临时文件加 rename，单写入者使用，不是逐事件 fsync 的持久 journal。

加载会拒绝未知格式版本、不连续序号、缺少末尾换行或未完成的工具交换；不猜测修复损坏日志。取消或工具执行中断可能让当前内存会话处于未完成状态，本课程不实现该状态的恢复：新建会话重新运行，保留原始日志用于诊断。

## 验证范围

`npm run check` 不调用模型 API，也不启动 dsh Web UI；模型适配器通过假的 HTTP 响应验证。真实端点的凭据、计费和在线模型行为需在你配置密钥后另行验证。文档检查只验证本地链接目标存在，不验证远程链接可达性或 Markdown 锚点。
