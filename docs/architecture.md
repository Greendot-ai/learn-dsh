# 从循环到插件组合

先读 [01](../s01_agent_loop/README.md) 与 [03](../s03_plugins/README.md)，再用这张图定位代码。

```text
scripts/lesson.ts ───→ sNN/code.ts
                         │
                         └─→ lib/loop.ts
                              │   ├─ protocol.ts：消息、模型接口、脚本响应
                              │   └─ model.ts：可选 DeepSeek API 适配器
                              ├─ tools.ts：schema / guard / handler
                              └─ session.ts：消息事件、实际请求事件

s11/code.ts → lib/plugins.ts → 真正的 Cordis Context
                             ├─ learnModel   → Model provider
                             ├─ learnTools   → ToolRegistry
                             │                 ├─ 文件读取 / 问候
                             │                 ├─ skills.ts
                             │                 ├─ subagent.ts
                             │                 └─ jobs.ts
                             ├─ learnSession → Session
                             └─ learnLoop    → runAgent + context.ts

s12/code.ts → 官方 Cordis + dsh-system-prompt + dsh-tools
                           + dsh-tool-executor-native
                           + greet-plugin.ts
```

## 一次请求怎样流动

1. `runAgent` 在会话中追加用户消息。
2. `project` 根据历史构造本轮输入；默认保留全部消息，第 11 章只保留最近两轮。
3. `ToolRegistry.schemas()` 生成当前工具描述。
4. 会话追加 `request` 事件，记录实际发送的消息和工具 schema。
5. 模型返回最终文本或一个以上工具调用；返回值先经过结构校验。
6. 每个工具调用都经过统一 guard、JSON 解析、工具参数校验和执行，结果按调用 ID 记录。
7. 有工具调用则进入下一步；没有则返回文本。预算耗尽或取消会显式失败。

普通工具错误成为模型可读的错误结果；取消会中断整个调用链。两种路径不能混淆，否则模型可能把被取消的操作当成已完成。

## 为什么使用 learn 前缀

`learnTools`、`learnSession` 等服务属于本课程；真正的 dsh 使用 `ctx.tools`、`ctx.sessions`、`ctx.systemPrompt` 等服务。区分名字可以避免把精简教学协议误当成官方 API。第 12 章是单独的官方管线集成，且不导入教学注册表。

## 组合与生命周期

`createHarness` 挂载服务和能力插件。循环服务声明 `inject`，工具插件持有自己的注册 effect；根 fiber 卸载会先回收子插件，后台任务也被取消并等待退出。

`ctx.on()` 注册的监听器自动归所属插件；自建的 `ToolRegistry` 不知道 Cordis 生命周期，因此它返回的 disposer 必须交给 `ctx.effect()`。官方 `ctx.tools.register()` 已经完成这种归属登记。

## 适用边界

教学实现适合本地、可信的演示目录。文件路径检查不解决并发文件替换竞态，`mutates` 依赖工具作者如实声明，后台任务依赖工具合作响应 `AbortSignal`。它没有进程沙箱、持久任务队列、多人并发会话、流式 UI 或生产级日志恢复。

所有具体简化及官方入口集中在[源码对应表](official-map.md)；启动和排错见[运行说明](running.md)。
