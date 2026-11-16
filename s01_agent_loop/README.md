# 01 · 一个循环，让模型使用工具

[课程目录](../README.md) · 下一章：[工具注册表](../s02_tools/README.md)

本章只需要理解 `async / await`、数组和 JSON。先看 [code.ts](code.ts)，它把整个循环放在一个文件里。

## 要解决的问题

模型返回「请执行 greet」并不等于工具已经执行。模型只生成结构化请求，程序要执行它，把结果交回模型，才能得到基于结果的回答。只发一次请求，就在工具调用处提前结束了。

## 核心机制

维护一个消息数组，每次模型响应先追加进去。如果响应没有 `tool_calls`，循环结束；否则按名字找到工具，执行后将每个结果作为 `role: tool` 追加，再次请求模型。

```text
user: Use greet to greet dsh.
assistant: tool_calls = [{ id: "call-1", name: "greet", ... }]
tool: tool_call_id = "call-1", content = "Hello, dsh!"
assistant: Hello, dsh!
```

结果中的 `tool_call_id` 必须与请求中的 `id` 对应。一次响应可能有多个工具调用，所以源码里还有一个遍历 `tool_calls` 的内层循环。示例顺序执行，确保所有工具结果返回后才再次请求模型。

离线模式用 [ScriptedModel](../lib/protocol.ts) 固定两次响应：先请求问候工具，再输出文本。问候函数真实执行；最终文本是预设答案。因此可以验证消息流，但不能据此证明模型理解了用户意图。

核心分支是：

```ts
messages.push(reply)
if (!reply.tool_calls?.length) { console.log(reply.content); return }
```

不要把工具结果直接打印后就退出。第二次模型请求才让它有机会解释工具结果。代码同时设置最多 8 次模型请求，避免模型不断调用工具而无法结束。

## 运行

从仓库根目录执行：

```sh
npm run lesson -- 1
```

预期输出 `Hello, dsh!`。想看真实模型选择工具，先按[运行说明](../docs/running.md)配置密钥，再运行 `npm run lesson -- 1 --live`。真实输出不保证与脚本一致。

## 动手练习

1. 在 `model.complete` 前打印消息角色；应该看到第二次输入包含 `user → assistant → tool`。
2. 删除工具结果消息再运行，观察脚本模型与真实 API 的差异：脚本仍可能返回答案，它不是协议验证器。
3. 在一条脚本响应里添加第二个工具调用，并赋予不同的 ID。确认程序返回两个工具结果再继续。

完成标准：你能画出两次模型请求，而不是把一次工具调用画成整个 Agent。下一章会用共享循环加入协议校验与工具分发。

## 与真实 dsh 的对应

对应官方 `agent-loop` 的驱动职责，但这里没有流式事件、Agent 注册、并发控制或取消恢复。生产 dsh 的扩展通常通过插件完成；本章只是把闭环展开，便于理解。阅读入口与差异见[源码对应表](../docs/official-map.md)。
