# 12 · 写一个真正的 dsh 工具插件

上一章：[组合 Harness](../s11_harness/README.md) · [课程目录](../README.md)

本章目标：使用官方 dsh 包编写工具插件，验证它能注册、执行、渲染结果，并随插件卸载而移除。

## 要解决的问题

能自己写一个 Harness，不等于已经会扩展 dsh。需要识别官方服务契约、实际运行工具管线，并确认插件卸载时能力确实移除。

## 核心机制

[greet-plugin.ts](greet-plugin.ts) 不导入任何 `lib/` 教学实现。它只声明 `inject = ['tools']`，使用官方 `defineTool` 定义工具，并注册到 `ctx.tools`。

```ts
ctx.tools.register(defineTool({
  name: 'learn_dsh_greet',
  description: 'Greet a person by name.',
  parameters: { name: { type: 'string', required: true, description: 'Person to greet.' } },
  output: {
    schema: { type: 'string' },
    render: (_args, value) => [{ type: 'text', text: value }],
  },
  async execute(args, exec) {
    exec.signal.throwIfAborted()
    return `Hello, ${args.name}!`
  },
}))
```

留意两个接口差异：`parameters` 在这里直接定义各参数，不是完整的 Chat Completions 参数对象；`execute` 返回工具的原始结果值（canonical value），本例为字符串，再由 `output.render` 转成模型可见的文本内容块。

[code.ts](code.ts) 装配最少的官方服务：`dsh-system-prompt`、`dsh-tools`、`dsh-tool-executor-native`，然后加载问候插件。它真实调用 `tools.schemas()` 和 `tools.execute()`，断言返回内容，再卸载插件并断言工具从注册表消失。

这个 Context 只装配验证工具管线所需的服务，无需模型或 API Key。完整的官方 Agent 应用还需要模型循环、会话和客户端等组件；下面的扩展步骤再介绍如何在官方 Web 应用中加载同一插件。

## 运行

```sh
npm run lesson -- 12
```

预期输出：

```text
official dsh pipeline: [{"type":"text","text":"Hello, dsh!"}]
unloaded: tool removed from official registry
```

看到这两行，说明工具通过官方管线返回了预期结果，且卸载断言通过。本课程的离线自动检查覆盖到这里。以下扩展需要另外安装官方 CLI 并配置模型。

### 拓展：在官方 Web profile 中加载

从本仓库根目录生成带**绝对插件路径**的本机 overlay：

```sh
node scripts/plugin-patch.ts
npx @deepseek-ai/dsh@0.2.2-rc.3 web --patch ./.learn-dsh/real-dsh.patch.yml
```

第一次运行 `npx` 会询问安装官方 CLI。按官方应用引导配置模型并发起任务，让模型调用 `learn_dsh_greet`。这一步会安装额外依赖，真实模型调用也会消耗 API 额度。

CLI 的 `--patch` 不会把模块解析基准切换到 overlay 目录，所以生成器使用绝对模块路径；不要把该机器路径提交到仓库。生成文件放在已忽略的 `.learn-dsh/`。完整官方开发流程见[插件入门](https://github.com/deepseek-ai/deepseek-harness/blob/39163dd30f703a79079e2d2446545cff3c453738/docs/user/develop/basic/index.md)。

## 动手练习

1. 把问候工具改成 `learn_dsh_uppercase`，同步修改集成示例中的调用和断言。
2. 省略必需的 `name` 参数，观察官方管线怎样返回工具失败；不要直接绕过管线调用 `execute` 函数主体。
3. 卸载插件后再次查询 schema，确认没有该工具。保留这一断言，防止只验证安装成功而忽略卸载。

完成标准：你写的插件使用官方包，在官方管线中执行，且生命周期有可观察结果。

## 与真实 dsh 的对应

本章工具 API 与 executor 直接来自锁定的官方 npm 包。差异在装配范围：集成示例没有模型循环、完整 Session、profile 或客户端。包版本和源码阅读快照分别标注在[源码对应表](../docs/official-map.md)，升级时以执行验证为准。
