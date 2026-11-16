# 07 · 缩短输入，保留历史

上一章：[会话回放](../s06_sessions/README.md) · [课程目录](../README.md) · 下一章：[技能](../s08_skills/README.md)

## 要解决的问题

会话会越聊越长，模型输入却有大小与费用限制。直接删除历史会失去回放依据；直接取最后 N 条消息又可能从工具结果中间切开，造成 `tool_call_id` 找不到对应调用。

## 核心机制

[keepRecentTurns](../lib/context.ts) 用用户输入划分轮次，保留 system 消息和最近若干个完整轮次。一个轮次包含用户输入及之后所有助手、工具消息，直到下一条用户输入。

```text
完整历史：system | user₁ assistant₁ | user₂ assistant₂(tool-call) tool₂ assistant₃
保留一轮：system |                   user₂ assistant₂(tool-call) tool₂ assistant₃
```

调用和结果作为整体保留。投影前先校验完整消息序列，避免把原有的不完整历史当成合法输入。

原始 Session 不变，只有下一次请求的消息数组变短。`runAgent` 在 `project` 之后记录 `request` 事件，因此能同时回答「历史是什么」与「这次模型实际看见了什么」。

[code.ts](code.ts) 构造两轮历史，打印保留一轮的结果。第 11 章则把该函数真正接到模型调用前。

## 运行

```sh
npm run lesson -- 7
```

预期输出：

```text
log messages: 7 next request messages: 5
roles: system → user → assistant → tool → assistant
```

这只是按轮数裁剪。如果最近一轮本身很长，它仍然可能超出模型上下文；需要 token 预算、摘要或外部检索时，应增加明确机制，而不是称这段代码为完整压缩系统。

## 动手练习

1. 保留最近两轮，确认输出消息数恢复为 7。
2. 在最新一轮增加两次工具调用，确认调用与结果都保留。
3. 用 `messages.slice(-3)` 替代投影，观察它怎样丢失用户问题或工具调用；用 `validateTranscript` 检查配对。

完成标准：下一次请求可以变短，原始日志仍完整，保留的工具交换合法。

## 与真实 dsh 的对应

官方 dsh 分开管理系统提示词装配、请求上下文和 compaction。本章只有一种简单投影，没有摘要模型，也没有 token 估算。官方服务与对应目录见[源码对应表](../docs/official-map.md)。
