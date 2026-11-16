# 05 · 把权限放在执行路径上

上一章：[服务与事件](../s04_services_events/README.md) · [课程目录](../README.md) · 下一章：[会话回放](../s06_sessions/README.md)

## 要解决的问题

告诉模型「你是只读助手」不能阻止程序执行写工具。隐藏一个 schema 也不等于拒绝执行：旧对话、直接 API 调用或误配置仍可能传入这个工具名。执行层必须有统一检查。

## 核心机制

每个教学工具声明 `mutates`，注册表在调用 handler 前执行所有 guard。只读 guard 很小：

```ts
export const readOnly: Guard = (tool) => {
  if (tool.mutates) throw new Error(`Read-only policy denied ${tool.name}`)
}
```

[code.ts](code.ts) 注册一个名为 `write_note` 的工具，但它只会修改内存计数器，不写磁盘。工具仍出现在注册表里，guard 则阻止它执行。直接调用 `execute()` 也要经过同一检查。

三个概念要分开：工具定义描述行为；可见性控制模型能发现什么；执行权限决定一次调用能否运行。课程只实现其中最小的执行策略，不提供人工批准 UI 或权限继承系统。

guard 的失败成为明确的工具错误结果。此时计数器必须仍为 0；只有检查输出错误文本而不检查副作用，无法证明拒绝发生在执行之前。

## 运行

```sh
npm run lesson -- 5
```

预期输出含有 `Read-only policy denied write_note`，随后是 `writes: 0`。

## 动手练习

1. 添加只读工具并启用同一策略，确认它可以执行。
2. 把 `tools.guard(readOnly)` 移到执行之后，观察为什么它不能撤销已经产生的副作用。
3. 增加一个限定工具名称的 guard，确认多个 guard 都能拒绝调用。

完成标准：拒绝写操作时 handler 未执行；错误能交回模型；策略覆盖直接工具调用。

## 与真实 dsh 的对应

官方 dsh 的策略、工具可见性、批准与执行管线更丰富。教学中的 `mutates` 是作者自行声明的标志，恶意工具可以撒谎，因此这不是进程或文件系统沙箱。官方入口见[源码对应表](../docs/official-map.md)。
