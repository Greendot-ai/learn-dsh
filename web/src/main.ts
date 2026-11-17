import course from 'virtual:course'
import { stages } from '../meta.ts'
import type { Lesson } from '../types.ts'
import { parseRoute, progressKey, readProgress } from './state.ts'
import './style.css'

const repo = 'https://github.com/Greendot-ai/learn-dsh'
const app = document.querySelector<HTMLDivElement>('#app')!
const searchDialog = document.querySelector<HTMLDialogElement>('#search-dialog')!
const searchInput = document.querySelector<HTMLInputElement>('#search-input')!
const ids = course.lessons.map(lesson => lesson.id)
const e = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
const paths = {
  arrow: 'M5 12h14m-6-6 6 6-6 6', back: 'M19 12H5m6-6-6 6 6 6', down: 'm6 9 6 6 6-6',
  search: 'm21 21-4.6-4.6M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  book: 'M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-3H4zm16 0h-4a3 3 0 0 0-3 3v14a4 4 0 0 1 4-3h3z',
  code: 'm8 5-7 7 7 7m8-14 7 7-7 7m-3-16-3 20',
  layers: 'm12 3 10 6-10 6L2 9zm-10 12 10 6 10-6M2 12l10 6 10-6',
  terminal: 'm4 5 6 6-6 6m9 0h7', check: 'm5 12 4 4L19 6',
  clock: 'M12 8v5l3 2m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  sun: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1m-3 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  moon: 'M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10',
  github: 'M9 19c-4.3 1.3-4.3-2.2-6-2.7m12 5v-3.5c0-1 .1-1.4-.5-2 3.3-.4 6.5-1.6 6.5-7A5.4 5.4 0 0 0 19.5 5 5 5 0 0 0 19 1.5S17.7 1 15 3a13 13 0 0 0-6 0C6.3 1 5 1.5 5 1.5A5 5 0 0 0 4.5 5 5.4 5.4 0 0 0 3 8.8c0 5.4 3.2 6.6 6.5 7-.6.6-.5 1.2-.5 2v3.5',
  menu: 'M4 6h16M4 12h16M4 18h16', close: 'm6 6 12 12M6 18 18 6',
  external: 'M14 3h7v7m0-7L11 13m-1-8H4v15h15v-6',
  play: 'm8 4 12 8-12 8z', pause: 'M8 4v16M16 4v16', reset: 'M3 10a9 9 0 1 1 1 7M3 3v7h7',
  copy: 'M9 9h12v12H9zM5 15H3V3h12v2', file: 'M5 2h9l5 5v15H5zm9 0v6h5M9 13h6M9 17h6',
} satisfies Record<string, string>
const icon = (name: keyof typeof paths, className = '') => `<svg class="icon ${className}" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]}"/></svg>`
const lessonUrl = (id: string, query = '') => `#/lesson/${id}${query ? `?${query}` : ''}`
let route = parseRoute(location.hash)
let menuOpen = false
let timer: ReturnType<typeof setInterval> | undefined
let step = 0
let playing = false
function stored(key: string) { try { return localStorage.getItem(key) } catch (error) { return null /* Private browsing can disable storage. */ } }
function save(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch (error) { announce('当前浏览器未允许保存设置，本次访问仍可使用。') }
}
const completed = readProgress(stored(progressKey), ids)
function announce(text: string) { document.querySelector('#live-status')!.textContent = text }
function nextLesson() { return course.lessons.find(lesson => !completed.has(lesson.id)) ?? course.lessons[0]! }

function sidebar() {
  return `<aside id="sidebar" class="sidebar ${menuOpen ? 'is-open' : ''}" aria-label="课程导航">
    <a class="brand" href="#/" aria-label="Learn dsh 首页"><img src="${import.meta.env.BASE_URL}favicon.svg" width="34" height="34" alt=""/><span>learn<span class="brand-divider">/</span><strong>dsh</strong><small>DEEPSEEK HARNESS</small></span><span class="version">01</span></a>
    <button class="search-trigger" data-action="search">${icon('search')}<span>搜索课程…</span><kbd>⌘ K</kbd></button>
    <nav class="course-nav">
      <a class="overview-link ${route.kind === 'home' ? 'active' : ''}" href="#/" ${route.kind === 'home' ? 'aria-current="page"' : ''}>${icon('layers')}课程总览${icon('arrow')}</a>
      ${stages.map((stage, index) => `<section class="nav-group"><h2><span>${stage.english}</span>${stage.range}</h2>${course.lessons.filter(lesson => lesson.stage === index).map(lesson => `<a class="lesson-nav ${route.kind === 'lesson' && route.id === lesson.id ? 'active' : ''}" href="${lessonUrl(lesson.id)}" ${route.kind === 'lesson' && route.id === lesson.id ? 'aria-current="page"' : ''}><span class="nav-number ${completed.has(lesson.id) ? 'done' : ''}">${completed.has(lesson.id) ? icon('check') : lesson.number}</span><span>${lesson.title}</span>${route.id === lesson.id ? '<span class="active-dot"></span>' : ''}</a>`).join('')}</section>`).join('')}
      <section class="nav-group resource-nav"><h2>RESOURCES<span>延伸阅读</span></h2>
        <a href="#/guide/running" class="${route.id === 'running' ? 'active' : ''}">${icon('terminal')}运行与排错</a>
        <a href="#/guide/architecture" class="${route.id === 'architecture' ? 'active' : ''}">${icon('layers')}架构地图</a>
        <a href="#/guide/official-map" class="${route.id === 'official-map' ? 'active' : ''}">${icon('external')}官方源码对应</a>
      </section>
    </nav>
    <div class="sidebar-bottom"><div class="progress-label"><span>你的学习进度</span><strong>${completed.size}<span> / 12</span></strong></div><div class="progress-track"><span style="width:${completed.size / 12 * 100}%"></span></div><p>一步一章，慢慢构建。</p><div class="sidebar-links"><a href="${repo}" target="_blank" rel="noopener noreferrer">${icon('github')}Greendot-ai</a><span>MIT 开源</span></div></div>
  </aside>`
}
function shell(body: string, breadcrumb: string) {
  const dark = document.documentElement.dataset.theme === 'dark'
  app.innerHTML = `${sidebar()}${menuOpen ? '<button class="menu-overlay" data-action="menu" aria-label="关闭课程导航"></button>' : ''}<div class="workspace"><header class="topbar"><div class="breadcrumb"><button class="icon-button mobile-menu" data-action="menu" aria-label="${menuOpen ? '关闭' : '打开'}课程导航" aria-controls="sidebar" aria-expanded="${menuOpen}">${icon(menuOpen ? 'close' : 'menu')}</button><a href="#/">学习路径</a><span>/</span><span>${e(breadcrumb)}</span></div><div class="header-actions"><span class="keyless"><span></span>无需 API Key 即可开始</span><button class="icon-button" data-action="theme" aria-label="切换为${dark ? '浅色' : '深色'}主题" title="切换主题">${icon(dark ? 'sun' : 'moon')}</button><a class="github-link" href="${repo}" target="_blank" rel="noopener noreferrer">${icon('github')}<span>GitHub</span>${icon('external')}</a></div></header><main id="main" tabindex="-1">${body}</main><footer class="site-footer"><span>用一个个可运行的例子，理解 Agent 的工作方式。</span><span>Greendot-ai <span class="footer-dot">·</span> <a href="${repo}/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">MIT License</a></span></footer></div>`
}
function home() {
  const next = nextLesson()
  return `<div class="home-content"><section class="hero"><div class="hero-copy"><div class="eyebrow"><span class="tiny-square"></span>FROM LOOP TO HARNESS <span class="eyebrow-line"></span></div><h1>从一个循环，<br/>到完整的 <em>Harness.</em></h1><p class="hero-description">拆解 DeepSeek Harness 的工作原理。<br/>12 章 TypeScript 课程，每次只增加一个机制，<br class="wide-break"/>亲手搭建一个能使用工具的 Agent。</p><div class="hero-actions"><a class="button primary" href="${lessonUrl(next.id)}">${completed.size ? '继续学习' : '开始第一章'}${icon('arrow')}</a><a class="button text-button" href="#/guide/running">${icon('terminal')}本地运行</a></div><div class="hero-tags"><span><span class="status-dot"></span>离线可运行</span><span>TypeScript</span><span>MIT 开源</span></div></div>
    <div class="hero-visual"><div class="code-window"><div class="window-top"><span class="window-dots"><i></i><i></i><i></i></span><span>the-agent-loop.ts · 结构示意</span><span class="ts-badge">TS</span></div><div class="code-intro">// 一个 Agent，从这个循环开始。</div><pre><code><span class="hljs-keyword">for</span> (<span class="hljs-keyword">let</span> step = <span class="hljs-number">0</span>; step &lt; budget; step++) {
  <span class="hljs-keyword">const</span> reply = <span class="hljs-keyword">await</span> model.<span class="hljs-title function_">complete</span>(
    messages, tools, signal
  )
  messages.<span class="hljs-title function_">push</span>(reply)

  <span class="hljs-keyword">if</span> (!reply.tool_calls?.length) {
    <span class="hljs-keyword">return</span> reply.content
  }

  <span class="hljs-keyword">await</span> <span class="hljs-title function_">executeTools</span>(reply.tool_calls)
}</code></pre><div class="terminal-output"><span class="status-dot"></span><code>model → tools → model</code><span>↵</span></div></div><div class="visual-caption"><span class="caption-line"></span>模型负责决策，Harness 让它行动。<a href="${lessonUrl(course.lessons[0]!.id, 'tab=source')}" aria-label="阅读第一章完整源码">${icon('arrow')}</a></div></div></section>
    <section class="intro-strip" aria-label="课程特点"><div>${icon('book')}<span><strong>12 个渐进章节</strong><small>从原理到真实插件</small></span></div><div>${icon('code')}<span><strong>阅读与源码同步</strong><small>内容直接来自课程仓库</small></span></div><div>${icon('play')}<span><strong>交互式机制拆解</strong><small>按步骤观察状态如何变化</small></span></div></section>
    <section class="curriculum" id="curriculum"><div class="section-heading"><div><div class="eyebrow">THE LEARNING PATH</div><h2>一条循序渐进的学习路径<span>12 CHAPTERS</span></h2></div><span class="section-note">先理解，再动手。${icon('down')}</span></div>
    ${stages.map((stage, index) => `<section class="stage stage-${index}"><div class="stage-intro"><div class="stage-label"><span>0${index + 1}</span><span>${stage.english}</span></div><h3>${stage.name}</h3><p>${stage.description}</p><span class="stage-range">CHAPTER ${stage.range}</span></div><div class="lesson-grid">${course.lessons.filter(lesson => lesson.stage === index).map(lesson => `<a href="${lessonUrl(lesson.id)}" class="lesson-card"><div class="card-top"><span class="card-number">${lesson.number}</span><span class="card-english">${lesson.english}</span>${completed.has(lesson.id) ? `<span class="completed-dot" aria-label="已学完">${icon('check')}</span>` : icon('arrow', 'card-arrow')}</div><h4>${lesson.title}</h4><p>${lesson.summary}</p><div class="card-bottom"><span>${icon('code')}${course.files[`${lesson.id}/code.ts`]!.lines} 行入口源码</span><span>${icon('clock')}约 ${lesson.minutes} 分钟</span></div></a>`).join('')}</div></section>`).join('')}</section>
    <section class="start-banner"><div class="start-symbol">${icon('terminal')}</div><div><div class="eyebrow">LEARN BY BUILDING</div><h2>准备好，让第一行代码跑起来。</h2><p>安装依赖，运行演示。从头到尾都可以不使用 API Key。</p></div><a class="button primary" href="#/guide/running">查看运行指南${icon('arrow')}</a></section>
    <div class="attribution">受 <a href="https://github.com/shareAI-lab/learn-claude-code" target="_blank" rel="noopener noreferrer">learn-claude-code</a> 启发，围绕 <a href="https://github.com/deepseek-ai/deepseek-harness" target="_blank" rel="noopener noreferrer">DeepSeek Harness</a> 编写。独立教学项目，非 DeepSeek 官方课程。</div></div>`
}
function sourcePanel(lesson: Lesson) {
  const selected = route.params.get('file') ?? `${lesson.id}/code.ts`
  const file = course.files[selected]
  if (!file) return `<div class="empty-state"><h2>未找到源码文件</h2><a href="${lessonUrl(lesson.id, 'tab=source')}">返回本章入口源码</a></div>`
  const files = [...new Set([...lesson.files, selected])]
  return `<section class="source-panel"><div class="source-note">${icon('code')}本章入口与其引用的共享模块。文件内容在构建时从仓库读取。</div><div class="source-layout"><nav class="file-tree" aria-label="源码文件"><span class="file-tree-label">EXPLORER</span>${files.map(path => `<a href="${lessonUrl(lesson.id, `tab=source&file=${encodeURIComponent(path)}`)}" class="${path === selected ? 'active' : ''}" ${path === selected ? 'aria-current="page"' : ''}>${icon('file')}<span>${e(path)}</span></a>`).join('')}</nav><div class="source-main"><label class="mobile-file-select">源码文件<select id="source-select">${files.map(path => `<option value="${e(path)}" ${path === selected ? 'selected' : ''}>${e(path)}</option>`).join('')}</select></label><div class="source-toolbar"><span>${icon('file')}<code>${e(selected)}</code></span><div><span>${file.lines} 行</span><button class="icon-button" data-action="copy-source" aria-label="复制当前源码">${icon('copy')}</button><a class="icon-button" href="${repo}/blob/main/${selected}" target="_blank" rel="noopener noreferrer" aria-label="在 GitHub 打开当前源码">${icon('external')}</a></div></div><div class="source-code"><pre class="line-numbers" aria-hidden="true">${Array.from({ length: file.lines }, (_, i) => i + 1).join('\n')}</pre><pre class="highlighted-source"><code>${file.html.trimEnd()}</code></pre></div></div></div></section>`
}
function demoPanel(lesson: Lesson) {
  const current = lesson.steps[step]!
  return `<section class="mechanism"><div class="mechanism-title"><div><div class="eyebrow">UNDER THE HOOD</div><h2>一步一步，看机制发生。</h2></div><span class="demo-counter">${String(step + 1).padStart(2, '0')} <span>/ ${String(lesson.steps.length).padStart(2, '0')}</span></span></div><p class="demo-disclaimer">交互式机制示意 · 使用固定教学数据，不会运行源码或调用模型。</p><div class="step-flow">${lesson.steps.map((item, index) => `<button class="step-node ${index === step ? 'current' : index < step ? 'passed' : ''}" data-action="demo-step" data-step="${index}" ${index === step ? 'aria-current="step"' : ''}><span>${index < step ? icon('check') : index + 1}</span><strong>${item.title}</strong>${index < lesson.steps.length - 1 ? icon('arrow', 'step-arrow') : ''}</button>`).join('')}</div><div class="step-detail" aria-live="polite"><div class="step-detail-heading"><span>STEP ${step + 1}</span><h3>${current.title}</h3></div><p>${current.detail}</p><pre><code>${e(current.code)}</code></pre></div><div class="demo-controls"><button class="button secondary icon-label" data-action="demo-play" ${step === lesson.steps.length - 1 && !playing ? 'disabled' : ''}>${icon(playing ? 'pause' : 'play')}${playing ? '暂停' : '自动播放'}</button><button class="icon-button" data-action="demo-reset" aria-label="重置演示">${icon('reset')}</button><div class="control-spacer"></div><button class="button secondary" data-action="demo-back" ${step === 0 ? 'disabled' : ''}>${icon('back')}上一步</button><button class="button primary" data-action="demo-next" ${step === lesson.steps.length - 1 ? 'disabled' : ''}>下一步${icon('arrow')}</button></div><aside class="demo-takeaway">${icon('layers')}<div><strong>记住这个机制</strong><p>${lesson.insight}</p></div></aside></section>`
}
function lessonPage(lesson: Lesson) {
  const tab = route.params.get('tab') === 'source' ? 'source' : route.params.get('tab') === 'mechanism' ? 'mechanism' : 'tutorial'
  const index = course.lessons.indexOf(lesson)
  const previous = course.lessons[index - 1]
  const next = course.lessons[index + 1]
  const done = completed.has(lesson.id)
  return `<div class="lesson-content"><header class="lesson-header"><div class="lesson-eyebrow"><span class="chapter-pill">CHAPTER ${lesson.number}</span><span>${stages[lesson.stage]!.name}</span><span>·</span><span>${lesson.english}</span></div><h1>${lesson.title}</h1><p>${lesson.summary}</p><div class="lesson-meta"><span>${icon('clock')}约 ${lesson.minutes} 分钟阅读</span><span>${icon('code')}TypeScript</span><span><span class="status-dot"></span>离线可运行</span><a href="${repo}/tree/main/${lesson.id}" target="_blank" rel="noopener noreferrer">本章目录${icon('external')}</a></div></header><blockquote class="insight">${lesson.insight}</blockquote><nav class="view-tabs" aria-label="章节视图">${([['tutorial', 'book', '阅读教程'], ['source', 'code', '查看源码'], ['mechanism', 'layers', '机制演示']] as const).map(([key, glyph, label]) => `<a class="${tab === key ? 'active' : ''}" href="${lessonUrl(lesson.id, key === 'tutorial' ? '' : `tab=${key}`)}" ${tab === key ? 'aria-current="page"' : ''}>${icon(glyph)}${label}${key === 'mechanism' ? '<span class="tab-pill">交互</span>' : ''}</a>`).join('')}</nav>
    ${tab === 'tutorial' ? `<div class="reading-layout"><article class="prose">${lesson.html}</article><aside class="on-this-page"><span>本章内容</span><nav>${lesson.headings.map(heading => `<a href="${lessonUrl(lesson.id, `section=${encodeURIComponent(heading.id)}`)}">${e(heading.title)}</a>`).join('')}</nav><div class="run-card">${icon('terminal')}<strong>在终端亲手运行</strong><code>npm run lesson -- ${index + 1}</code><button data-action="copy-command" data-command="npm run lesson -- ${index + 1}">复制命令 ${icon('copy')}</button></div></aside></div>` : tab === 'source' ? sourcePanel(lesson) : `<div id="demo-root">${demoPanel(lesson)}</div>`}
    <div class="complete-lesson"><div><span class="complete-icon ${done ? 'done' : ''}">${icon('check')}</span><div><h3>${done ? '这一章，已掌握。' : '理解了？给自己做个标记。'}</h3><p>${done ? '随时回来复习，或者继续下一章。' : '建议读完教程，运行示例，再完成动手练习。'}</p></div></div><button class="button ${done ? 'secondary' : 'primary'}" data-action="complete">${done ? '取消已学标记' : '标记为已学完'}${icon('check')}</button></div>
    <nav class="lesson-pagination" aria-label="章节翻页">${previous ? `<a href="${lessonUrl(previous.id)}">${icon('back')}<span><small>上一章 · ${previous.number}</small><strong>${previous.title}</strong></span></a>` : '<a href="#/">' + icon('back') + '<span><small>返回</small><strong>课程总览</strong></span></a>'}${next ? `<a href="${lessonUrl(next.id)}"><span><small>下一章 · ${next.number}</small><strong>${next.title}</strong></span>${icon('arrow')}</a>` : `<a href="#/guide/official-map"><span><small>继续探索</small><strong>官方源码对应</strong></span>${icon('arrow')}</a>`}</nav></div>`
}
function render() {
  route = parseRoute(location.hash)
  if (route.kind === 'home') { document.title = 'Learn dsh · 从零理解 DeepSeek Harness'; shell(home(), '课程总览') }
  else if (route.kind === 'lesson') {
    const lesson = course.lessons.find(item => item.id === route.id)
    if (lesson) { document.title = `${lesson.number} · ${lesson.title} — Learn dsh`; shell(lessonPage(lesson), `${lesson.number} · ${lesson.title}`) }
    else notFound()
  } else if (route.kind === 'guide') {
    const guide = course.guides.find(item => item.id === route.id)
    if (guide) {
      document.title = `${guide.title} — Learn dsh`
      shell(`<div class="guide-content"><div class="eyebrow">THE FIELD GUIDE</div><h1>${e(guide.title)}</h1><p class="guide-lead">从教学实现出发，找到运行入口与官方对应关系。</p><div class="reading-layout"><article class="prose">${guide.html}</article><aside class="on-this-page"><span>本页内容</span><nav>${guide.headings.map(heading => `<a href="#/guide/${guide.id}?section=${encodeURIComponent(heading.id)}">${e(heading.title)}</a>`).join('')}</nav></aside></div></div>`, guide.title)
    } else notFound()
  } else notFound()
}
function notFound() { document.title = '页面未找到 — Learn dsh'; shell('<div class="empty-state"><div class="eyebrow">404 · WRONG TURN</div><h1>这一页还不在学习路径上。</h1><p>返回课程目录，继续你的探索。</p><a class="button primary" href="#/">返回课程总览' + icon('arrow') + '</a></div>', '页面未找到') }
function stopDemo() { clearInterval(timer); timer = undefined; playing = false }
function redrawDemo() {
  const lesson = course.lessons.find(item => item.id === route.id)
  const container = document.querySelector('#demo-root')
  if (lesson && container) container.innerHTML = demoPanel(lesson)
}
async function copy(text: string, button: HTMLElement) {
  try {
    await navigator.clipboard.writeText(text)
    const original = button.innerHTML
    button.innerHTML = `${icon('check')}<span>已复制</span>`
    announce('已复制到剪贴板')
    setTimeout(() => { if (button.isConnected) button.innerHTML = original }, 1600)
  } catch (error) { announce('复制失败，请选择代码后手动复制。') }
}
function updateSearch() {
  const query = searchInput.value.trim().toLocaleLowerCase().slice(0, 100)
  const matches = course.lessons.filter(lesson => `${lesson.title} ${lesson.english} ${lesson.text}`.toLocaleLowerCase().includes(query))
  document.querySelector('#search-results')!.innerHTML = `<div class="search-count">${query ? `找到 ${matches.length} 个章节` : '从一个概念开始'}</div>${matches.length ? matches.map(lesson => {
    const position = Math.max(0, lesson.text.toLocaleLowerCase().indexOf(query))
    const snippet = query ? lesson.text.slice(Math.max(0, position - 25), position + 80).replace(/\s+/g, ' ') : lesson.summary
    return `<a class="search-result" href="${lessonUrl(lesson.id)}"><span class="search-number">${lesson.number}</span><span><strong>${lesson.title}<small>${lesson.english}</small></strong><span>${e(snippet)}</span></span>${icon('arrow')}</a>`
  }).join('') : `<div class="search-empty">没有找到“${e(searchInput.value.trim().slice(0, 100))}”<p>试试「工具」「插件」「Session」或「取消」。</p></div>`}`
}
function openSearch() { searchInput.value = ''; updateSearch(); searchDialog.showModal(); searchInput.focus() }
document.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return
  const button = event.target.closest<HTMLElement>('[data-action]')
  const action = button?.dataset.action
  if (!button || !action) return
  if (action === 'search') openSearch()
  if (action === 'menu') { menuOpen = !menuOpen; render(); document.querySelector<HTMLElement>(menuOpen ? '.overview-link' : '.mobile-menu')?.focus() }
  if (action === 'theme') {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = theme
    save('learn-dsh-theme', theme); render(); document.querySelector<HTMLElement>('[data-action="theme"]')?.focus()
  }
  if (action === 'complete') {
    if (completed.has(route.id)) completed.delete(route.id); else completed.add(route.id)
    save(progressKey, JSON.stringify([...completed])); render()
    document.querySelector<HTMLElement>('[data-action="complete"]')?.focus()
    announce(`已学完 ${completed.size} / 12 章`)
  }
  if (action === 'copy-code') void copy(button.closest('.codeblock')?.querySelector('code')?.textContent ?? '', button)
  if (action === 'copy-command') void copy(button.dataset.command ?? '', button)
  if (action === 'copy-source') void copy(course.files[route.params.get('file') ?? `${route.id}/code.ts`]?.raw ?? '', button)
  if (action.startsWith('demo-')) {
    const lesson = course.lessons.find(item => item.id === route.id)
    if (!lesson) return
    if (action === 'demo-play' && !playing && step < lesson.steps.length - 1) {
      playing = true
      timer = setInterval(() => { step = Math.min(step + 1, lesson.steps.length - 1); if (step === lesson.steps.length - 1) stopDemo(); redrawDemo() }, 2200)
    } else {
      stopDemo()
      if (action === 'demo-reset') step = 0
      if (action === 'demo-next') step = Math.min(step + 1, lesson.steps.length - 1)
      if (action === 'demo-back') step = Math.max(step - 1, 0)
      if (action === 'demo-step') step = Math.max(0, Math.min(Number(button.dataset.step) || 0, lesson.steps.length - 1))
    }
    redrawDemo()
    const focus = document.querySelector<HTMLButtonElement>(`[data-action="${action}"]${action === 'demo-step' ? `[data-step="${step}"]` : ''}`)
    if (focus && !focus.disabled) focus.focus()
  }
})
searchInput.addEventListener('input', updateSearch)
searchDialog.addEventListener('click', event => { if (event.target === searchDialog) searchDialog.close(); if (event.target instanceof Element && event.target.closest('a')) searchDialog.close() })
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); if (!searchDialog.open) openSearch() }
  if (event.key === 'Escape' && menuOpen) { menuOpen = false; render() }
  if (searchDialog.open && event.key === 'ArrowDown' && event.target === searchInput) { event.preventDefault(); searchDialog.querySelector<HTMLAnchorElement>('.search-result')?.focus() }
})
document.addEventListener('change', event => {
  if (event.target instanceof HTMLSelectElement && event.target.id === 'source-select') location.hash = lessonUrl(route.id, `tab=source&file=${encodeURIComponent(event.target.value)}`)
})
window.addEventListener('hashchange', () => {
  const previous = route
  const next = parseRoute(location.hash)
  if (next.kind !== previous.kind || next.id !== previous.id || next.params.get('tab') !== previous.params.get('tab')) { stopDemo(); step = 0 }
  menuOpen = false
  if (searchDialog.open) searchDialog.close()
  render()
  const section = route.params.get('section')
  if (section) document.getElementById(section)?.scrollIntoView({ block: 'start' })
  else { window.scrollTo(0, 0); document.querySelector<HTMLElement>('#main')?.focus({ preventScroll: true }) }
})
render()
const section = route.params.get('section')
if (section) requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView())
