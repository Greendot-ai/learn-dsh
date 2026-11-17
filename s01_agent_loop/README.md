# 01 · 一个循环，让模型使用工具

[课程目录](../README.md) · 下一章：[工具注册表](../s02_tools/README.md)

本章目标：跑通“模型请求工具 → 程序执行 → 结果交回模型”的完整循环。

先阅读 [code.ts](code.ts)。整个循环都在一个文件中，只需要理解 `async / await`、数组和 JSON。

## 要解决的问题

模型返回工具名和参数时，程序还没有执行工具。程序需要接收请求、执行工具，再把结果发给模型，让模型继续回答。若只请求模型一次，流程就会停在工具调用处。

## 核心机制

用一个消息数组保存对话。每次收到模型响应，先将其追加到数组：没有 `tool_calls` 时结束循环；有工具调用时，逐个执行，将结果记为 `role: tool` 消息，再请求模型。

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

工具执行后，循环还需要再次请求模型，模型才能根据结果生成回答。示例最多请求模型 8 次；超过上限仍未得到最终文本时，程序抛出错误。

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
