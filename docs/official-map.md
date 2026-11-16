# 课程与官方 dsh 的对应

本课程以 [DeepSeek Harness 源码快照](https://github.com/deepseek-ai/deepseek-harness/tree/39163dd30f703a79079e2d2446545cff3c453738) 为阅读参考，集成示例锁定官方 npm 包 `0.2.2-rc.3` 与 Cordis `4.1.0`。源码快照与 npm 制品是两条独立的版本线，不假定它们逐文件一致；集成验证以本仓库锁文件中的 npm 制品为准。dsh 处于 developer preview，跟随上游升级时需要重新运行第 12 章和测试。

课程借鉴 [learn-claude-code](https://github.com/shareAI-lab/learn-claude-code/tree/448c75bb596917ad196cc1fb7558f459c5c50fdd) 的逐章教学方式，不是其 API 的兼容实现，也不将其 Claude 工具协议直接当作 dsh 协议。

| 章 | 课程实现 | 官方阅读入口 | 需要辨别的简化 |
|---|---|---|---|
| [01](../s01_agent_loop/README.md) | `Model.complete` 与有界循环 | [agent-loop](https://github.com/deepseek-ai/deepseek-harness/tree/39163dd30f703a79079e2d2446545cff3c453738/packages/core/agent-loop) | 非流式 Chat Completions，不是官方流式事件协议 |
| [02](../s02_tools/README.md) | `ToolRegistry` | [tools](https://github.com/deepseek-ai/deepseek-harness/tree/39163dd30f703a79079e2d2446545cff3c453738/packages/core/tools) | schema、解析器和 handler 由教学代码维护；官方有 defineTool、scope 与输出渲染 |
| [03](../s03_plugins/README.md) | 真正的 Cordis fiber + 教学工具 | [生命周期教程](https://github.com/deepseek-ai/deepseek-harness/blob/39163dd30f703a79079e2d2446545cff3c453738/docs/cordis-tutorial/02-lifecycle-and-effects.md) | 不实现配置热重载；只展示挂载与卸载 |
| [04](../s04_services_events/README.md) | 真正的 Service、inject、waterfall | [Cordis primer](https://github.com/deepseek-ai/deepseek-harness/blob/39163dd30f703a79079e2d2446545cff3c453738/docs/cordis-primer.md) | `learn/*` 是课程自定义事件，不是官方事件 |
| [05](../s05_permissions/README.md) | `mutates` + `readOnly` guard | [工具管线](https://github.com/deepseek-ai/deepseek-harness/tree/39163dd30f703a79079e2d2446545cff3c453738/packages/core/tools) | 不是完整权限模型；官方还有工具可见性、策略与人工批准等能力 |
| [06](../s06_sessions/README.md) | 教学 JSONL 事件快照 | [session](https://github.com/deepseek-ai/deepseek-harness/tree/39163dd30f703a79079e2d2446545cff3c453738/packages/core/session) | 不是 dsh Session 格式；不能导入官方日志 |
| [07](../s07_context/README.md) | `keepRecentTurns` 整轮投影 | [system-prompt](https://github.com/deepseek-ai/deepseek-harness/tree/39163dd30f703a79079e2d2446545cff3c453738/packages/core/system-prompt)、[compaction](https://github.com/deepseek-ai/deepseek-harness/tree/39163dd30f703a79079e2d2446545cff3c453738/packages/compaction) | 按轮数裁剪，不计 token、不生成压缩摘要；也没有官方的 prompt 分区装配 |
| [08](../s08_skills/README.md) | 发现元数据、读取一个 SKILL.md | [skill](https://github.com/deepseek-ai/deepseek-harness/tree/39163dd30f703a79079e2d2446545cff3c453738/packages/skill) | 固定清单，不扫描目录、不安装第三方技能 |
| [09](../s09_subagents/README.md) | 独立 `Session` + 只读工具子集 | [subagent](https://github.com/deepseek-ai/deepseek-harness/tree/39163dd30f703a79079e2d2446545cff3c453738/packages/subagent) | 同进程、单层委派；不是进程隔离，不持久化子会话关联 |
| [10](../s10_background_jobs/README.md) | 内存任务状态机 | [jobs](https://github.com/deepseek-ai/deepseek-harness/tree/39163dd30f703a79079e2d2446545cff3c453738/packages/jobs) | 取消依赖合作；进程退出后不能恢复任务 |
| [11](../s11_harness/README.md) | Cordis 服务与能力插件的装配 | [架构](https://github.com/deepseek-ai/deepseek-harness/blob/39163dd30f703a79079e2d2446545cff3c453738/docs/architecture.md)、[bundles](https://github.com/deepseek-ai/deepseek-harness/tree/39163dd30f703a79079e2d2446545cff3c453738/packages/bundle) | 代码装配，不实现官方 profile、bundle、patch 的完整配置系统 |
| [12](../s12_real_dsh/README.md) | 官方 defineTool、registry、native executor | [添加工具](https://github.com/deepseek-ai/deepseek-harness/blob/39163dd30f703a79079e2d2446545cff3c453738/docs/cookbook/adding-a-tool.md) | 验证官方工具管线，没有启动官方 Agent 循环或 Web 应用 |

## 阅读次序

先沿着一章对应的包找到 `src/index.ts` 和包 README；再阅读声明的服务依赖与事件。到第 12 章，再跟踪 `defineTool → ctx.tools.register → schemas / execute → disposer`。不要试图把所有目录一次读完。

## 一个关键区别：工具声明与执行

在本课程中，注册表同时返回模型 schema 和执行 handler。在官方 dsh 中，工具注册表拥有执行，`ctx.systemPrompt` 负责组合实际模型请求中的系统内容与工具声明。生产实现还区分工具的 canonical value、给模型的渲染内容与 UI 元数据；第 12 章的 `output.schema` 和 `output.render` 展示了这种分离。

## 一个关键约束：输入可重建

第 6、7、11 章记录 `request` 事件，包括实际发送的消息与工具 schema，因此裁剪后的请求仍然可查。官方 dsh 的「模型可见输入必须能由会话重建」涉及更多类型的事件、上下文与资源引用；教学日志只覆盖本课程的文本请求。子代理在本课程中不保存独立日志到磁盘，这不能替代生产审计。
