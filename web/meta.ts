import type { LessonMeta } from './types.ts'

export const stages = [
  { name: '建立基础', english: 'FOUNDATIONS', range: '01 — 04', description: '跑通模型与工具的循环，再用插件、服务和事件组织能力。' },
  { name: '管理运行时', english: 'RUNTIME', range: '05 — 10', description: '控制工具执行，保存会话历史，按需加载技能，并管理委派与后台任务。' },
  { name: '走向真实 dsh', english: 'INTEGRATION', range: '11 — 12', description: '组合前面的教学模块，再用官方 dsh 包验证工具的注册、执行与卸载。' },
]

export const metadata: Record<string, LessonMeta> = {
  s01_agent_loop: {
    title: 'Agent 循环', english: 'The agent loop', stage: 0,
    summary: '执行模型提出的工具调用，再把结果交回模型，直到得到最终回答。',
    insight: '工具调用不是终点。把执行结果交回模型，闭环才成立。',
    steps: [
      { title: '接收任务', detail: '用户消息进入 messages，成为模型的输入。', code: 'messages = [{ role: "user", content: "Greet dsh." }]' },
      { title: '模型请求工具', detail: '脚本模型返回工具名、参数和调用 ID，由程序负责执行。', code: 'assistant → greet({ name: "dsh" })\ncall id: call_1' },
      { title: '程序执行', detail: 'Harness 按名字找到执行函数，并保存带调用 ID 的结果。', code: 'greet({ name: "dsh" })\n→ { role: "tool", tool_call_id: "call_1", content: "Hello, dsh!" }' },
      { title: '再次请求模型', detail: '完整的 user → assistant → tool 消息传回模型。', code: 'model.complete(messages, tools, signal)' },
      { title: '返回答案', detail: '这次没有工具调用，循环返回最终文本。', code: 'assistant → "Hello, dsh!"\nreturn reply.content' },
    ],
  },
  s02_tools: {
    title: '工具注册表', english: 'Tools as capabilities', stage: 0,
    summary: '集中管理工具描述、参数校验与调用分发，新增工具时无需修改循环。',
    insight: '循环只负责推进，注册表负责系统能做什么。',
    steps: [
      { title: '注册工具', detail: '保存工具名、说明、参数描述与执行函数。', code: 'const remove = tools.register(greetTool())' },
      { title: '提供工具描述', detail: 'schema 向模型描述工具用途和参数格式，不包含执行函数的实现。', code: 'tools.schemas() → [{ function: { name: "greet", parameters: … } }]' },
      { title: '校验并执行', detail: '根据名称找到工具，经过执行策略和参数校验后调用执行函数。', code: 'await tools.execute(call, signal)\n→ 工具的 run(args, signal)' },
      { title: '移除注册', detail: '调用注册时返回的清理函数，工具随即从注册表移除。', code: 'remove()\ntools.schemas() → 不再包含 greet' },
    ],
  },
  s03_plugins: {
    title: '插件与 effect', english: 'Plugins & effects', stage: 0,
    summary: '将工具注册与清理绑定到插件，卸载时自动收回能力。',
    insight: '每一份注册都需要一个清理它的生命周期。',
    steps: [
      { title: '挂载插件', detail: 'Cordis 为这次插件挂载创建 fiber。', code: 'const fiber = ctx.plugin(plugin)' },
      { title: '登记副作用', detail: 'ctx.effect 执行注册，并保存返回的清理函数。', code: 'ctx.effect(() => tools.register(greetTool()))' },
      { title: '使用能力', detail: '插件存活期间，工具可以被发现和调用。', code: 'tools.schemas() → ["greet"]' },
      { title: '卸载插件', detail: '销毁 fiber 时，Cordis 自动执行 effect 的清理。', code: 'await fiber.dispose()\ntools.schemas() → []' },
    ],
  },
  s04_services_events: {
    title: '服务与事件', english: 'Services & events', stage: 0,
    summary: '通过服务声明依赖，通过事件在插件之间传递信息和组合行为。',
    insight: '声明需要什么，比手工安排加载顺序更可靠。',
    steps: [
      { title: '声明依赖', detail: '消费者缺少服务时保持 pending，不运行 apply。', code: 'inject = ["learnTools"]\nconsumer: pending' },
      { title: '提供服务', detail: '具名服务可用后，Cordis 激活消费者。', code: 'ctx.plugin(LearnTools)\nconsumer: active' },
      { title: '事件协作', detail: '事件传递信息，waterfall 通过 next() 继续下一个监听器。', code: 'ctx.on("learn/format", async (text, next) => {\n  return `[${await next()}]`\n})' },
      { title: '依赖卸载', detail: '服务消失时，消费者随之卸载并清理副作用，等待依赖再次出现。', code: 'await provider.dispose()\nconsumer: pending\neffects: cleaned' },
    ],
  },
  s05_permissions: {
    title: '执行权限', english: 'Policy at execution', stage: 1,
    summary: '在工具执行前检查只读策略，确认被拒绝的调用没有产生副作用。',
    insight: '隐藏 schema 不等于拒绝执行。检查必须发生在 handler 之前。',
    steps: [
      { title: '收到调用', detail: '示例请求 write_note；这个演示工具只增加内存计数器，不写磁盘。', code: 'tool_call → write_note({})' },
      { title: '检查工具声明', detail: '注册表把工具交给 guard，后者检查 mutates 标志。', code: 'tool.mutates === true' },
      { title: '运行 guard', detail: '只读 guard 在执行函数之前拒绝写操作。', code: 'readOnly(tool) → deny\nhandler was not called' },
      { title: '验证拒绝结果', detail: '返回工具错误，同时确认计数器仍为 0，执行函数没有运行。', code: 'tool → { error: "Read-only policy denied write_note" }\nwrites: 0' },
    ],
  },
  s06_sessions: {
    title: '会话回放', english: 'Sessions & replay', stage: 1,
    summary: '保存消息和模型请求，从磁盘恢复历史，再继续同一段对话。',
    insight: '最终答案不足以解释过程；记录模型实际看到的输入。',
    steps: [
      { title: '追加消息', detail: '教学日志为每个事件保存连续的 seq，从 0 开始。', code: '{ version: 1, seq: 0, data: { type: "message", message: { role: "user", … } } }' },
      { title: '记录请求', detail: '请求事件保留当时的 messages 和工具 schema。', code: '{ version: 1, seq: 1, data: { type: "request", messages: […], tools: […] } }' },
      { title: '原子保存', detail: '先验证序列与大小，再通过临时文件 rename 保存。', code: 'validateTranscript(messages)\nwrite(temp) → rename(temp, destination)' },
      { title: '恢复会话', detail: '读取时校验版本、事件顺序与工具调用配对。', code: 'const restored = await Session.load(file)\nrestored.messages()' },
    ],
  },
  s07_context: {
    title: '上下文投影', english: 'Context projection', stage: 1,
    summary: '按完整轮次缩短模型输入，保留原始历史及工具调用与结果的配对。',
    insight: '按完整轮次裁剪，不能把工具调用和结果拆开。',
    steps: [
      { title: '完整历史', detail: 'Session 仍持有所有消息与请求事件。', code: 'history = [system, turn_1, turn_2, turn_3]' },
      { title: '划分轮次', detail: '每次 user 输入开启一个完整轮次。', code: 'turn = [user, assistant(tool_calls), tool, assistant]' },
      { title: '生成投影', detail: '只保留 system 与最近两个完整轮次。', code: 'keepRecentTurns(history, 2)\n→ [system, turn_2, turn_3]' },
      { title: '记录真实输入', detail: '模型收到投影，请求事件记录投影；原历史不变。', code: 'session.request(projected, tools)\nmodel.complete(projected, tools, signal)' },
    ],
  },
  s08_skills: {
    title: '渐进加载技能', english: 'Discover, then load', stage: 1,
    summary: '先查看技能名称与简介，需要时再读取 SKILL.md 中的详细步骤。',
    insight: '让能力可被发现，不代表每次都把全文塞进上下文。',
    steps: [
      { title: '发现技能', detail: '先获得名称和简短说明。', code: 'list_skills()\n→ [{ name: "source-reading", description: … }]' },
      { title: '选择技能', detail: '本章直接加载示例技能；第 11 章再由脚本模型发起同样的调用。', code: 'task: 阅读 dsh 插件源码\nselected: source-reading' },
      { title: '按名称加载', detail: '从固定注册表查找技能，不接受任意文件路径。', code: 'load_skill({ name: "source-reading" })' },
      { title: '读取技能正文', detail: '在 Agent 循环中，正文会作为工具结果进入后续输入；读取本身不会执行步骤或增加权限。', code: 'tool → SKILL.md 正文\n下一次模型请求包含这条工具结果' },
    ],
  },
  s09_subagents: {
    title: '受限子代理', english: 'Isolated subagents', stage: 1,
    summary: '给子代理独立的消息历史、受限工具和请求次数上限，只向父代理返回简短结果。',
    insight: '父代理需要短结论，子代理负责消化细节。',
    steps: [
      { title: '明确任务', detail: '父代理只传递当前委派文本。', code: 'delegate_read({ task: "Read agent-note.txt" })' },
      { title: '创建子会话', detail: '子代理使用独立 Session 和仅含 read_file 的注册表，仍在同一进程中执行。', code: 'child.session = new Session()\nchild.tools = [read_file]' },
      { title: '执行子循环', detail: '子代理最多请求模型四次，不继承父代理全部能力。', code: 'runAgent({ …, maxSteps: 4 })' },
      { title: '返回摘要', detail: '最多 2000 字符的结果回到父代理。', code: 'child result.slice(0, 2000)\n→ parent tool result' },
    ],
  },
  s10_background_jobs: {
    title: '后台任务', english: 'Jobs & cancellation', stage: 1,
    summary: '用任务 ID 查询后台工作，通过取消信号和等待机制完成资源回收。',
    insight: '取消不是丢弃 Promise，而是等待任务真正完成清理。',
    steps: [
      { title: '启动任务', detail: 'Jobs 立即返回任务 ID，并保存取消控制器和表示工作结束的 Promise。', code: 'const id = jobs.start(work)\n→ "job-1"' },
      { title: '查询状态', detail: '调用者用任务 ID 查看状态，无需一直等待工作结束。', code: 'jobs.status(id)\n→ { id: "job-1", status: "running" }' },
      { title: '请求取消', detail: 'cancel 发出取消信号，并等待任务退出。任务需要主动响应信号。', code: 'const result = await jobs.cancel(id)' },
      { title: '确认终态', detail: '示例中的长计时器被中断后进入 cancelled；dispose 会取消并等待所有任务结束。', code: 'result.status → "cancelled"\nawait jobs.dispose()' },
    ],
  },
  s11_harness: {
    title: '组合 Harness', english: 'Put it all together', stage: 2,
    summary: '用 Cordis 组合模型、工具、会话与循环，并统一管理能力插件的生命周期。',
    insight: '组合来自清晰的边界，而不是越来越大的中央循环。',
    steps: [
      { title: '装配服务', detail: 'Cordis 挂载 Tools、Model、Session 与 Loop 服务。', code: 'ctx.plugin(LearnTools)\nctx.plugin(LearnModel)\nctx.plugin(LearnSession)\nctx.plugin(LearnLoop)' },
      { title: '挂载能力', detail: '能力插件通过 effects 注册技能、子代理与任务工具。', code: 'lesson-capabilities → read_file, skills, subagents, jobs' },
      { title: '运行任务', detail: '执行循环经过权限策略，并记录实际请求与结果。', code: 'await ctx.learnLoop.run(prompt)' },
      { title: '整体卸载', detail: '卸载根 fiber，等待后台任务退出，并清理工具注册与服务。', code: 'await ctx.fiber.dispose()\nregistrations: removed\njobs: settled' },
    ],
  },
  s12_real_dsh: {
    title: '接入真实 dsh', english: 'A real dsh plugin', stage: 2,
    summary: '用官方 defineTool 定义工具，验证注册、执行、渲染和卸载的完整过程。',
    insight: '本章直接运行官方工具管线，将前面学到的接口与生命周期对应到 dsh。',
    steps: [
      { title: '声明契约', detail: '插件声明 inject = [tools]，通过 defineTool 定义接口。', code: 'export const inject = ["tools"]\ndefineTool({ name: "learn_dsh_greet", … })' },
      { title: '注册工具', detail: '官方注册表接管生命周期和 schema。', code: 'ctx.tools.register(greetTool)\nctx.tools.schemas()' },
      { title: '执行与渲染', detail: 'NativeExecutor 返回结果，output.render 生成模型可见内容。', code: 'execute({ name: "dsh" }) → "Hello, dsh!"\nrender → [{ type: "text", text: "Hello, dsh!" }]' },
      { title: '卸载验证', detail: '销毁插件后，确认工具已从官方注册表移除。', code: 'await fiber.dispose()\nlearn_dsh_greet: unregistered' },
    ],
  },
}
