# learn-dsh

通过 12 章可运行的 TypeScript 示例，从最小 Agent 循环开始，逐步构建可组合的 Harness，再接入官方 [DeepSeek Harness（dsh）](https://github.com/deepseek-ai/deepseek-harness) 工具管线。

中文 | [English](README.en.md)

本项目借鉴 [learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) 逐章引入核心机制的教学方式，讲解模型与工具如何协作，以及插件、会话和后台任务如何管理。适合具备 JavaScript 基础、了解 TypeScript 基本语法的开发者，无需先读完官方源码。

**这是独立的教学项目，与 DeepSeek 官方无隶属关系。** 第 1–11 章使用精简教学运行时；第 3 章起实际使用 Cordis；第 12 章使用官方 dsh 包注册并执行工具。离线模型返回预设响应，用于观察机制，不具备语言理解能力。

## 配套网页

[在线阅读课程](https://greendot-ai.github.io/learn-dsh/)。网站采用开源 [Starlight](https://starlight.astro.build/) 文档主题，提供教程、源码浏览、逐步机制演示、搜索与本地阅读进度。浏览无需安装软件或提供 API Key；机制演示使用固定数据，不执行源码。

如需本地预览网站，先按下方步骤安装依赖，再运行 `npm run web:dev`。

运行 `npm run web:check` 验证网站内容、类型和生产构建；部署方式见[网站开发说明](web/README.md)。GitHub Pages 工作流在 PR 上检查构建，合入 main 后发布。

## 本地运行

需要 **Node.js ≥24.9.0**，建议使用 [.nvmrc](.nvmrc) 指定版本。不需要 Python、pnpm 或 API Key。

```sh
git clone https://github.com/Greendot-ai/learn-dsh.git
cd learn-dsh
npm ci --ignore-scripts
npm run lesson -- 1
npm run demo
```

`demo` 顺序运行全部 12 章，始终使用离线脚本模型，不调用 API。想查看目录可运行 `npm run lesson`；单章也可直接运行 `node s03_plugins/code.ts`。所有命令从仓库根目录执行。

第一章会输出 `Hello, dsh!`；最后一章会输出 `official dsh pipeline` 和 `unloaded: tool removed from official registry`。你看到的工具执行、会话回放和插件卸载都是真实执行，只有模型决策被固定成脚本。

## 先看懂这个循环

```text
用户消息 → 模型 → 最终回答 → 结束
               ↓ 工具调用
           校验与执行策略
               ↓
           执行工具、记录结果
               └────────→ 再次请求模型
```

模型提出下一步行动，Harness 负责组织模型请求、工具执行、上下文和会话记录。工具描述（schema）告诉模型可以请求什么、参数是什么格式；执行策略检查这次请求是否允许运行。

## 学习路线

建议按顺序学习：先阅读每章教程、预测输出，再对照机制演示与源码，最后本地运行并完成练习。第 1 章的循环写在单个文件中；第 2 章起逐步复用 `lib/` 中的教学模块，每章入口负责突出当前机制。

| 章 | 增加的机制 | 你会回答的问题 |
|---|---|---|
| [01 · Agent 循环](s01_agent_loop/README.md) | 模型 → 工具 → 模型 | 一次工具调用为什么还不是完整的 Agent？ |
| [02 · 工具注册表](s02_tools/README.md) | schema、参数校验、分发 | 怎样添加工具而不修改循环？ |
| [03 · 插件与 effect](s03_plugins/README.md) | Cordis 插件及可撤销注册 | 卸载插件时谁收回能力？ |
| [04 · 服务与事件](s04_services_events/README.md) | inject、事件、waterfall | 插件如何等待依赖、扩展行为？ |
| [05 · 执行权限](s05_permissions/README.md) | 运行前的统一策略 | 提示词说「只读」为什么不够？ |
| [06 · 会话回放](s06_sessions/README.md) | 事件记录、恢复与续聊 | 重启后怎样重建输入？ |
| [07 · 上下文投影](s07_context/README.md) | 保留完整轮次的裁剪 | 请求变短后，历史还能查吗？ |
| [08 · 技能](s08_skills/README.md) | 元数据发现、按需加载 | 怎样避免每次请求都携带全部技能说明？ |
| [09 · 子代理](s09_subagents/README.md) | 独立上下文与受限工具集 | 怎样委派而不共享所有历史？ |
| [10 · 后台任务](s10_background_jobs/README.md) | 状态、取消、资源回收 | 一个工具调用返回后，工作怎样继续？ |
| [11 · 组合 Harness](s11_harness/README.md) | 通过插件装配能力 | 怎样把前面的机制连接起来？ |
| [12 · 真实 dsh 插件](s12_real_dsh/README.md) | 官方 defineTool 与执行管线 | 怎样把教学理解迁移到官方项目？ |

## 可选：连接 DeepSeek

只有第 1、11 章支持 `--live`。真实调用会发送消息和工具结果，并消耗你的 API 额度。第 11 章的文件工具固定读取本仓库的演示工作区。

```sh
cp .env.example .env
# 在本地编辑 .env，填入 DEEPSEEK_API_KEY
npm run lesson -- 1 --live
npm run lesson -- 11 --live "读取 hello.txt，说明 Harness 的作用"
```

也可用 `npm start -- "你的问题"` 执行第 11 章的一个真实任务；一个任务可能包含多次模型请求，结束后程序退出。默认模型是 `deepseek-chat`，默认端点是 `https://api.deepseek.com`。适配器采用非流式 Chat Completions，并限制模型请求次数；配置、调用上限与排错见[运行说明](docs/running.md)。不要提交 `.env` 或会话中的敏感信息。

## 阅读源码与验证

- [架构图与目录职责](docs/architecture.md)：先知道教学实现各部分放在哪里。
- [官方源码对应表](docs/official-map.md)：逐章进入 dsh 源码，并查看教学简化。
- [运行说明](docs/running.md)：命令、API 配置和常见问题。
- [贡献指南](CONTRIBUTING.md)：怎样增加一个可验证的课程机制。

```sh
npm run check
```

检查包含 TypeScript 类型检查、行为测试、全部离线演示，以及课程章节和本地 Markdown 链接目标检查。CI 在 Linux 和 macOS 上运行相同检查，无需配置密钥。

## 致谢与许可证

感谢 [shareAI-lab/learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) 的渐进课程设计，以及 [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) 的插件架构与公开文档。课程代码按 [MIT](LICENSE) 开源；参考项目的许可说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。