# 04 · 等待服务，用事件组合行为

上一章：[插件与 effect](../s03_plugins/README.md) · [课程目录](../README.md) · 下一章：[执行权限](../s05_permissions/README.md)

本章目标：用服务依赖决定插件何时启动，用事件让插件协作，而不直接依赖彼此的实现。

## 要解决的问题

如果工具插件先加载，工具注册表后加载，直接访问属性会报错。手动维护「先 A、再 B、再 C」很快变成脆弱的初始化顺序。另一个问题是：多个插件怎样扩展行为，而不互相导入具体实现？

## 核心机制

服务提供可按名称访问的共享能力；使用服务的插件称为消费者，通过 `inject` 声明依赖。依赖缺失时，消费者处于等待状态（pending），不执行 `apply`；服务可用后才启动。服务被移除时，消费者随之卸载，清理已注册的副作用。

[code.ts](code.ts) 故意先挂载 consumer，再挂载 `LearnTools`。`active` 只是用来观察消费者是否已加载，服务实现位于 [lib/plugins.ts](../lib/plugins.ts)。`await consumer` 等待进入稳定状态，pending 也是稳定状态，不代表必需服务已经出现；演示随后显式等待 provider 与消费者的状态收敛。

事件用于无需直接调用对方的扩展。课程用 TypeScript 声明合并为 `Events` 增加类型：

```ts
owner.on('learn/format', async (_text, next) => (await next()).toUpperCase())
```

这是 waterfall（瀑布式调用）：监听器通过 `next()` 继续后续调用，并可处理返回值；不调用 `next()` 就会中止后续链。本例先取得后续回调返回的 `hello, dsh`，再将其转为大写。

事件不是都相同。普通通知用 `emit`，不会等待异步完成；需要包装并返回结果时使用约定为 waterfall 的事件。第 11 章的 `learn/turn` 是完成通知，不用于阻塞或批准工具执行。

## 运行

```sh
npm run lesson -- 4
```

预期顺序：

```text
before provider: false
after provider: true
HELLO, DSH
provider unloaded: false
```

依赖决定消费者何时活跃，事件决定它怎样扩展另一个动作。这两个职责应分开理解。

## 动手练习

1. 增加第二个 waterfall 监听器，在结果两侧添加括号；预测包装顺序再运行。
2. 暂时移除一个监听器的 `next()`，观察后续行为为什么不再执行。
3. 卸载 provider 后重新挂载，确认 consumer 重新激活且监听器只执行一次。

完成标准：分清服务依赖、事件订阅与事件执行模式，不把 `await plugin` 当作「所有服务一定就绪」。

## 与真实 dsh 的对应

使用真正的 Cordis `Service`、注入与 typed events。`learn/format` 和 `learn/turn` 是教学事件，不能直接拿到官方 dsh 中订阅。官方服务和事件阅读入口见[对应表](../docs/official-map.md)。
