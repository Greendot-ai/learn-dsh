# 11 · 用插件把 Harness 组合起来

上一章：[后台任务](../s10_background_jobs/README.md) · [课程目录](../README.md) · 下一章：[真实 dsh 插件](../s12_real_dsh/README.md)

本章目标：把前面的模块组合成一个教学 Harness，跟踪一次任务如何经过模型、工具、会话和资源清理。

## 要解决的问题

前面分别观察了循环、工具、策略和状态。现在需要让它们协作，同时保留边界：换模型不修改工具，卸载能力不修改循环，裁剪上下文不删除原始历史。

## 核心机制

[createHarness](../lib/plugins.ts) 用真正的 Cordis 装配四个教学服务和一个能力插件：

| 组件 | 职责 |
|---|---|
| `learnModel` | 提供当前模型适配器 |
| `learnTools` | 保存教学工具与 guard |
| `learnSession` | 保存消息与实际请求事件 |
| `learnLoop` | 注入前三个服务，运行一轮用户任务 |
| `lesson-capabilities` | 注册文件、技能、委派、后台任务和只读策略 |

循环服务可以先挂载，由 `inject` 等待依赖服务就绪。`learnLoop.run()` 在每次模型请求前生成最近两轮的上下文投影，并在用户任务完成后发送 `learn/turn` 通知。工具注册、guard 和 Jobs 资源都通过 effect 归属于能力插件，根 fiber 卸载时统一回收。

[code.ts](code.ts) 只负责选择模型、演示工作区和子模型工厂，然后调用组合入口。离线脚本依次请求读文件、发现技能、加载技能、委派读取、启动后台计时器，再结束。父代理一共记录 6 次模型请求；后台任务随 Harness 清理，不保证在最终回答前完成。

能力通过插件装配，推进逻辑仍使用第 2 章的共享函数 `runAgent`。增加技能、委派或任务工具时，修改的是能力插件，循环实现不需要随之增加分支。

## 运行

```sh
npm run lesson -- 11
```

预期输出以 `[scripted demo]` 开头，随后 `recorded model requests: 6`。这是一次固定流程演示，不意味着脚本模型能够自由规划。

配置密钥后可以执行：

```sh
npm run lesson -- 11 --live "读取 hello.txt，再请子代理给出一句总结"
```

程序处理一个用户任务后退出，不会持续等待下一次输入。一个任务可以包含多次模型请求；live 模式中的子代理也会调用 API，请求次数上限与排错见[运行说明](../docs/running.md)。

## 动手练习

1. 增加一个能力插件，把 `uppercase` 注册进去，不修改循环实现。
2. 在 `learn/turn` 监听器中统计输出次数；一次成功任务应只收到一次完成通知。
3. 保存 `registry` 引用，卸载根 fiber 后确认 `schemas()` 为空；确认 Jobs 不再留下活动计时器。

完成标准：可以指出所有服务的提供方和消费者，且解释根卸载怎样到达每个工具和后台任务。

## 与真实 dsh 的对应

这是以 Cordis 组合教学服务的 Harness，不是官方 dsh Agent 实现。官方通过 profile、bundle、patch 装配大量插件，并由专门服务负责提示词装配、作用域与执行等行为。[架构图](../docs/architecture.md)与[源码对应表](../docs/official-map.md)给出迁移路径；下一章直接使用官方工具管线。
