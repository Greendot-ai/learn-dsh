import type { LessonMeta } from './types.ts'

export const stages = [
  { name: '建立基础', english: 'FOUNDATIONS', range: '01 — 04', description: '从最小循环出发，把能力变成可以组合的插件。' },
  { name: '管理运行时', english: 'RUNTIME', range: '05 — 10', description: '让 Agent 有边界、有记忆，也能协作与取消。' },
  { name: '走向真实 dsh', english: 'INTEGRATION', range: '11 — 12', description: '组合教学 Harness，再接入官方工具管线。' },
]

export const metadata: Record<string, LessonMeta> = {
  s01_agent_loop: {
    title: 'Agent 循环', english: 'The agent loop', stage: 0,
    summary: '用一个循环，连接模型决策、工具执行和最终回答。',
    insight: '工具调用不是终点。把执行结果交回模型，闭环才成立。',
    steps: [
      { title: '接收任务', detail: '用户消息进入 messages，成为模型的输入。', code: 'messages = [{ role: "user", content: "Greet dsh." }]' },
      { title: '模型选择工具', detail: '脚本模型返回结构化调用；它没有执行任何工具。', code: 'assistant → greet({ name: "dsh" })\ntool_call_id: call_1' },
      { title: '程序执行', detail: 'Harness 按名字找到执行函数，并保存带调用 ID 的结果。', code: 'greet({ name: "dsh" })\n→ { role: "tool", tool_call_id: "call_1", content: "Hello, dsh!" }' },
      { title: '再次请求模型', detail: '完整的 user → assistant → tool 消息传回模型。', code: 'model.complete(messages, tools, signal)' },
      { title: '返回答案', detail: '这次没有工具调用，循环返回最终文本。', code: 'assistant → "Hello, dsh!"\nreturn reply.content' },
    ],
  },
  s02_tools: {
    title: '工具注册表', english: 'Tools as capabilities', stage: 0,
    summary: '把工具从循环中拿出来，让 schema 与执行各司其职。',
    insight: '循环只负责推进，注册表负责系统能做什么。',
    steps: [
      { title: '注册工具', detail: '保存工具名、说明、参数与执行函数。', code: 'tools.register(greetTool)' },
      { title: '暴露 schema', detail: '模型只看到可调用接口，看不到 handler 的实现。', code: 'tools.schemas() → [{ function: { name: "greet", parameters: … } }]' },
      { title: '按名称分发', detail: '解析 JSON 参数，根据工具名执行 handler。', code: 'tools.execute(call, signal)\n→ greetTool.run(args, signal)' },
      { title: '卸载能力', detail: '注册返回的 disposer 只移除它拥有的那个注册。', code: 'const remove = tools.register(greetTool)\nremove()' },
    ],
  },
  s03_plugins: {
    title: '插件与 Effect', english: 'Plugins & effects', stage: 0,
    summary: '能力可以挂载，也必须能随插件一起被撤销。',
    insight: '每一份注册都需要一个清理它的生命周期。',
    steps: [
      { title: '挂载插件', detail: 'Cordis 为这次插件挂载创建 fiber。', code: 'const fiber = ctx.plugin(plugin)' },
      { title: '登记副作用', detail: '注册表的移除函数交给 ctx.effect 管理。', code: 'ctx.effect(() => tools.register(greetTool))' },
      { title: '使用能力', detail: '插件存活期间，工具可以被发现和调用。', code: 'tools.schemas() → ["greet"]' },
      { title: '卸载插件', detail: '销毁 fiber 时，Cordis 自动执行 effect 的清理。', code: 'await fiber.dispose()\ntools.schemas() → []' },
    ],
  },
  s04_services_events: {
    title: '服务与事件', english: 'Services & events', stage: 0,
    summary: '用依赖注入等待能力，用事件组合插件行为。',
    insight: '声明需要什么，比手工安排加载顺序更可靠。',
    steps: [
      { title: '声明依赖', detail: '消费者缺少服务时保持 pending，不运行 apply。', code: 'inject = ["learnTools"]\nconsumer: pending' },
      { title: '提供服务', detail: '具名服务可用后，Cordis 激活消费者。', code: 'ctx.plugin(LearnTools)\nconsumer: active' },
      { title: '事件协作', detail: '事件传递信息，waterfall 通过 next() 继续下一个监听器。', code: 'ctx.on("learn/format", async (text, next) => {\n  return `[${await next()}]`\n})' },
      { title: '依赖卸载', detail: '服务消失时，消费者随之卸载并清理 effects。', code: 'provider.dispose()\nconsumer: pending\neffects: cleaned' },
    ],
  },
  s05_permissions: {
    title: '执行权限', english: 'Policy at execution', stage: 1,
    summary: '把只读策略放进执行路径，而不是只写进提示词。',
    insight: '隐藏 schema 不等于拒绝执行。检查必须发生在 handler 之前。',
    steps: [
      { title: '收到调用', detail: '即使模型已经知道工具名，执行层仍重新检查权限。', code: 'tool_call → write_file({ path: "notes.md", content: "…" })' },
      { title: '读取声明', detail: '注册表检查工具的 mutates 标志。', code: 'tool.mutates === true' },
      { title: '运行 guard', detail: '只读 guard 在执行函数之前拒绝写操作。', code: 'readOnly(tool) → deny\nhandler was not called' },
      { title: '返回拒绝', detail: '把错误结果交回对话，模型据此调整计划。', code: 'tool → "Error: Read-only policy denied write_file"' },
    ],
  },
  s06_sessions: {
    title: '会话回放', english: 'Sessions & replay', stage: 1,
    summary: '保存消息与真实请求，让一次运行可以被重建。',
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
    summary: '缩短下一次输入，同时保留完整、可回放的历史。',
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
    summary: '先发现可用方法，再按需读取 SKILL.md 的详细步骤。',
    insight: '让能力可被发现，不代表每次都把全文塞进上下文。',
    steps: [
      { title: '发现技能', detail: '先获得名称和简短说明。', code: 'list_skills()\n→ [{ name: "source-reading", description: … }]' },
      { title: '选择方法', detail: '模型根据任务选择需要的方法。', code: 'task: trace a dsh plugin\nselected: source-reading' },
      { title: '按名称加载', detail: '从固定注册表查找技能，不接受任意文件路径。', code: 'load_skill({ name: "source-reading" })' },
      { title: '使用全文', detail: '技能内容作为工具结果进入后续模型输入。', code: 'tool → SKILL.md contents\nmodel → follows the source-reading steps' },
    ],
  },
  s09_subagents: {
    title: '受限子代理', english: 'Isolated subagents', stage: 1,
    summary: '委派独立任务，隔离历史、工具集合与执行预算。',
    insight: '父代理需要短结论，子代理负责消化细节。',
    steps: [
      { title: '明确任务', detail: '父代理只传递当前委派文本。', code: 'delegate_read({ task: "Read agent-note.txt" })' },
      { title: '隔离环境', detail: '子代理创建独立 Session 和仅含 read_file 的注册表。', code: 'child.session = new Session()\nchild.tools = [read_file]' },
      { title: '执行子循环', detail: '子代理最多请求模型四次，不继承父代理全部能力。', code: 'runAgent({ …, maxSteps: 4 })' },
      { title: '返回摘要', detail: '最多 2000 字符的结果回到父代理。', code: 'child result.slice(0, 2000)\n→ parent tool result' },
    ],
  },
  s10_background_jobs: {
    title: '后台任务', english: 'Jobs & cancellation', stage: 1,
    summary: '用状态、任务 ID 和取消信号管理长时间运行的工作。',
    insight: '取消不是丢弃 Promise，而是等待任务真正完成清理。',
    steps: [
      { title: '启动任务', detail: 'Jobs 保存任务 ID、AbortController 与完成 Promise。', code: 'job_start({ label: "demo" }) → { id: "job-1" }' },
      { title: '继续对话', detail: '工具返回任务 ID，循环可以继续推进。', code: 'job_status({ id: "job-1" })\n→ running' },
      { title: '请求取消', detail: 'AbortSignal 通知任务，并等待清理完成。', code: 'controller.abort()\nawait job.completion' },
      { title: '确认终态', detail: '教学任务进入 cancelled；插件卸载也会取消存活任务。', code: 'job_status({ id: "job-1" })\n→ cancelled' },
    ],
  },
  s11_harness: {
    title: '组合 Harness', english: 'Put it all together', stage: 2,
    summary: '把模型、循环、工具和会话装配成一个完整教学系统。',
    insight: '组合来自清晰的边界，而不是越来越大的中央循环。',
    steps: [
      { title: '装配服务', detail: 'Cordis 挂载 Tools、Model、Session 与 Loop 服务。', code: 'ctx.plugin(LearnTools)\nctx.plugin(LearnModel)\nctx.plugin(LearnSession)\nctx.plugin(LearnLoop)' },
      { title: '挂载能力', detail: '能力插件通过 effects 注册技能、子代理与任务工具。', code: 'lesson-capabilities → read_file, skills, subagents, jobs' },
      { title: '运行任务', detail: '执行循环经过权限策略，并记录实际请求与结果。', code: 'await ctx.learnLoop.run(prompt)' },
      { title: '整体卸载', detail: '停止任务，清理注册，释放服务。', code: 'await ctx.dispose()\nregistrations: removed\njobs: settled' },
    ],
  },
  s12_real_dsh: {
    title: '接入真实 dsh', english: 'A real dsh plugin', stage: 2,
    summary: '使用官方 defineTool 与执行器，验证真实插件的完整生命周期。',
    insight: '教学实现到此为止；这一章直接运行官方 dsh 包。',
    steps: [
      { title: '声明契约', detail: '插件声明 inject = [tools]，通过 defineTool 定义接口。', code: 'export const inject = ["tools"]\ndefineTool({ name: "learn_dsh_greet", … })' },
      { title: '注册工具', detail: '官方注册表接管生命周期和 schema。', code: 'ctx.tools.register(greetTool)\nctx.tools.schemas()' },
      { title: '执行与渲染', detail: 'NativeExecutor 返回结果，output.render 生成模型可见内容。', code: 'execute({ name: "dsh" }) → "Hello, dsh!"\nrender → [{ type: "text", text: "Hello, dsh!" }]' },
      { title: '卸载验证', detail: '销毁插件后，确认工具已从官方注册表移除。', code: 'await fiber.dispose()\nlearn_dsh_greet: unregistered' },
    ],
  },
}
