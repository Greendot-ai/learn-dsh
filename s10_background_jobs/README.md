# 10 · 让工作继续，也让它能停下来

上一章：[子代理](../s09_subagents/README.md) · [课程目录](../README.md) · 下一章：[组合 Harness](../s11_harness/README.md)

## 要解决的问题

工具如果一直等待长任务完成，会阻塞下一步。直接扔一个无人管理的 Promise 又无法查询结果、取消工作或处理异常。需要给后台工作一个身份和生命周期。

## 核心机制

[Jobs](../lib/jobs.ts) 为每个任务保存 ID、状态、AbortController 和表示实际结束的 Promise。

```text
start → running → done
                → failed
cancel / dispose → 发出取消 → 等工作退出 → cancelled
```

`start` 立即返回 ID；`status` 返回快照；`wait` 等待结束；`cancel` 发出信号并等待；`dispose` 关闭入口、取消所有任务并等待退出。普通异常被收集为 failed，避免后台 Promise 出错后无人观察。

取消必须合作完成。示例使用支持 `AbortSignal` 的 `node:timers/promises`，不会在 signal 发出时就谎报工作已退出。一个忽略 signal 且永不结束的任务，也会让清理一直等待；生产系统通常还需要进程终止等边界。

[code.ts](code.ts) 先等待一个短任务完成，再取消一个长等待。计时器只是便于演示的工作，不启动 shell 或真正的索引服务。第 11 章把 start/status/cancel 暴露为模型工具，并归属于能力插件。

## 运行

```sh
npm run lesson -- 10
```

预期一个任务为 `done`，另一个为 `cancelled`。演示不需要等满 60 秒；取消会提前中断长计时器。

## 动手练习

1. 创建一个直接抛错的任务，检查状态为 failed 且包含可读错误。
2. 在任务主体的 `finally` 中释放资源，确认 `cancel()` 返回之前已经完成释放。
3. 调用 `dispose()` 后再 `start()`，确认入口拒绝新任务。

完成标准：任务不因最初的工具调用返回而丢失，所有异常可查询，卸载时没有遗留工作。

## 与真实 dsh 的对应

官方把任务能力、执行提供方和模型工具拆到 jobs 相关包。这里全部保存在内存，进程重启后不能恢复，也没有持久队列和并发配额。官方入口见[对应表](../docs/official-map.md)。
