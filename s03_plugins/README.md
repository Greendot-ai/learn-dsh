# 03 · 插件要能装上，也要能卸下

上一章：[工具注册表](../s02_tools/README.md) · [课程目录](../README.md) · 下一章：[服务与事件](../s04_services_events/README.md)

本章目标：让工具注册归属于插件，并在插件卸载时自动移除工具。

## 要解决的问题

一个模块可以注册工具，但模块停用后谁负责移除？如果只增加能力而不描述撤销，热重载、插件禁用和测试清理都会留下旧工具或重复注册。

## 核心机制

从本章开始使用官方维护的 `@deepseek-ai/cordis`。`Context` 是插件协作的入口；`ctx.plugin()` 返回一个 fiber，用来表示这次挂载的插件实例并管理其生命周期。effect 指插件产生的副作用及其清理，例如注册一个工具，并在卸载时移除它。

```ts
const fiber = await ctx.plugin({
  name: 'greeting', inject: ['learnTools'],
  apply(owner: Context) {
    owner.effect(() => owner.learnTools.registry.register(greetTool()))
  },
})
await fiber.dispose()
```

先阅读 [code.ts](code.ts)。`register()` 注册工具，并返回移除它的清理函数。`owner.effect()` 立即执行注册，将返回的函数绑定到插件生命周期。调用 `await fiber.dispose()` 后，清理完成，工具从 schema 清单中消失。

工具注册表属于自建教学代码，必须显式把 disposer 交给 Cordis。通过 `ctx.on` 注册的事件监听器已经由 Cordis 管理，不需要重复包装；第 12 章的官方工具注册也已管理 effect。

根 Context 的 `ctx.fiber.dispose()` 回收全部子插件。源码使用 `try / finally`，确保即使演示出错也会清理。

本章用 `learnTools` 服务暂存工具注册表。先把它视作「插件拿到共享能力的位置」，下一章再解释为什么要声明 `inject`。

## 运行

```sh
npm run lesson -- 3
```

预期输出：

```text
mounted: [ 'greet' ]
unloaded: []
```

这不是修改一个打印变量：卸载前后实际调用了同一个注册表的 `schemas()`。

## 动手练习

1. 给插件增加一个监听器或计时器；计时器要通过 `effect` 返回 `clearInterval` 清理函数。
2. 卸载该 fiber，确认工具消失，监听器不再响应，计时器不再触发。
3. 重新挂载插件，确认没有「Duplicate tool」错误。

完成标准：能明确说出每个资源归属于哪个插件，以及卸载时怎样释放。

## 与真实 dsh 的对应

插件、fiber 与 effect 都直接来自 Cordis，不是课程重写的模拟框架。精简的是工具注册表与服务集合。官方工具注册自身即是 effect；阅读[官方生命周期教程与源码入口](../docs/official-map.md)，不要把「所有注册都需手写清理」误当作 Cordis 规则。
