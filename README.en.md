# learn-dsh

[中文](README.md) | English

Learn [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness) by building a small TypeScript harness, one mechanism at a time. Inspired by the progressive teaching style of [learn-claude-code](https://github.com/shareAI-lab/learn-claude-code).

This is an independent educational project, unaffiliated with DeepSeek. Lessons and exercises are currently written in Chinese; the examples and this entry point are accessible in English. Lessons 1–11 use a simplified teaching runtime, Cordis is used from lesson 3, and lesson 12 executes a tool through official dsh packages.

## Companion website

The Chinese learning website includes all 12 lessons, a source explorer, deterministic mechanism demos, search, local progress, and light/dark themes. After installing dependencies, run `npm run web:dev`. Use `npm run web:check` for website validation and production builds. See the [website guide](web/README.md) for GitHub Pages deployment.

## Quick start

Use Node.js ≥24.9.0 (the pinned version is in [.nvmrc](.nvmrc)). No API key is needed.

```sh
git clone https://github.com/Greendot-ai/learn-dsh.git
cd learn-dsh
npm ci --ignore-scripts
npm run lesson -- 1
npm run demo
npm run check
```

Offline examples use scripted responses, not a local language model. Tools, session replay, cancellation, and plugin teardown actually execute. The demo command always runs offline, even when an API key exists in your environment.

## Course

| Lesson | Mechanism |
|---|---|
| [01](s01_agent_loop/README.md) | Model/tool loop |
| [02](s02_tools/README.md) | Tool schemas, parsing, and dispatch |
| [03](s03_plugins/README.md) | Cordis plugins and reversible effects |
| [04](s04_services_events/README.md) | Dependency injection and events |
| [05](s05_permissions/README.md) | Execution-time permission checks |
| [06](s06_sessions/README.md) | Session persistence and replay |
| [07](s07_context/README.md) | Whole-turn context projection |
| [08](s08_skills/README.md) | Skill discovery and deferred loading |
| [09](s09_subagents/README.md) | Isolated child transcripts |
| [10](s10_background_jobs/README.md) | Managed background work |
| [11](s11_harness/README.md) | Plugin composition |
| [12](s12_real_dsh/README.md) | An official dsh tool plugin |

## Optional live mode

Copy [.env.example](.env.example) to `.env`, set `DEEPSEEK_API_KEY`, then run:

```sh
npm run lesson -- 1 --live
npm run lesson -- 11 --live "Read hello.txt and explain what a harness does."
```

Live mode sends messages and tool results to the configured HTTPS endpoint and incurs API charges. It uses non-streaming Chat Completions, a bounded loop, and a read-only fixture workspace. See the [running guide](docs/running.md) and [official source map](docs/official-map.md) for details and differences from production dsh.

## License

[MIT](LICENSE). Upstream acknowledgements and license notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
