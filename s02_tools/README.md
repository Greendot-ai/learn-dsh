# 02 · 把工具从循环中拿出来

上一章：[Agent 循环](../s01_agent_loop/README.md) · [课程目录](../README.md) · 下一章：[插件与 effect](../s03_plugins/README.md)

## 要解决的问题

第一章直接判断 `greet`。每加一个工具都修改循环，会把「循环怎样推进」与「系统具备哪些能力」绑在一起。需要一个根据名称分发调用、向模型提供 schema 的注册表。

## 核心机制

[ToolRegistry](../lib/tools.ts) 保存三个信息：名字与说明、参数 schema、执行函数。`schemas()` 给模型能力清单；`execute()` 根据模型返回的名字选择 handler。循环只依赖这两个入口。

```ts
const tools = new ToolRegistry()
tools.register(greetTool())
tools.register(readFileTool(root))
```

这里的 `root` 是演示目录。完整初始化见 [code.ts](code.ts)；Agent 循环抽到 [lib/loop.ts](../lib/loop.ts)，后面的章节复用它。

模型输出不是可信函数参数。执行路径是：查名字 → 运行 guard → 解析 JSON → handler 用 Zod 校验参数 → 执行 → 限制结果长度。未知工具、坏 JSON、参数错误会变成 `{"error": ...}` 工具结果，让模型有机会调整请求；取消则向上传播，不伪装成普通结果。

`read_file` 只允许工作区内的相对路径，解析实际路径后检查目录边界，并拒绝大于 8000 字节的文件。通用工具结果最多 8000 字符。二者计量不同：字节限制控制文件读取，字符限制控制返回文本。

这些检查适用于私有演示目录，不能防止另一个进程在检查之后替换文件；它不是系统级文件沙箱。

## 运行

```sh
npm run lesson -- 2
```

示例真实读取 [hello.txt](../fixtures/workspace/hello.txt)。输出包含 `DeepSeek Harness: everything is a plugin.` 和脚本模型的最终文本。重点看第二次请求最后一条消息：它来自工具，不是预设在用户输入中。

## 动手练习

1. 注册一个 `uppercase` 工具，接受字符串 `text`；只修改注册与模型脚本，不修改 `runAgent`。
2. 让模型请求不存在的工具，确认第二次请求含有错误结果。
3. 把读取路径改成 `../outside.txt` 或绝对路径，确认程序拒绝越界或不合约的输入。

完成标准：新增工具不增加循环分支，坏参数也不会直接进入工具主体。

## 与真实 dsh 的对应

官方 `ctx.tools` 负责注册与执行，`defineTool` 将参数、canonical 输出值与模型渲染组织成定义。教学注册表仅返回字符串，schema 与 Zod 解析器需要作者保持一致。第 [12](../s12_real_dsh/README.md) 章会用官方 API 替换这部分；当前源码入口见[对应表](../docs/official-map.md)。
