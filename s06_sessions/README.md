# 06 · 把对话变成可回放的记录

上一章：[执行权限](../s05_permissions/README.md) · [课程目录](../README.md) · 下一章：[上下文投影](../s07_context/README.md)

## 要解决的问题

消息只放在内存数组里，进程重启就丢失。只存最终答案又无法解释模型用了哪个工具、看到什么结果。需要把会话事实保存下来，并能从记录恢复下一次输入。

## 核心机制

[Session](../lib/session.ts) 追加两种教学事件：`message` 记录用户、助手和工具消息；`request` 记录某次模型请求实际使用的消息与工具 schema。后者在下一章尤其重要，因为实际请求可能只是完整历史的一个投影。

事件包含版本号和连续序号，保存为每行一个 JSON 的快照：

```text
{"version":1,"seq":0,"data":{"type":"message","message":{"role":"system","content":"..."}}}
{"version":1,"seq":1,"data":{"type":"message","message":{"role":"user","content":"..."}}}
```

会话的内存记录只追加；`save` 则把完整记录写入同目录临时文件，再 rename 替换目标快照。这里不是对目标文件逐行追加，也没有每个事件的 fsync 保证。

`load` 校验大小、格式、序号和工具调用配对。未完成或损坏的工具交换不能直接作为下一次输入。保存也拒绝未完成交换及超过 2 MB 的日志，避免生成自己无法读取的快照。

[code.ts](code.ts) 先完成一次带工具调用的问候，保存并加载，然后继续问「我们做了什么」。恢复的是完整消息，不是把上一段最终答案复制成新用户输入。

## 运行

```sh
npm run lesson -- 6
```

预期输出 `replayed messages: 5` 和 `We greeted dsh.`。五条消息为 system、user、assistant 工具调用、tool 结果、assistant 最终回答。演示使用临时目录并在结束后删除；自行保存方式见[运行说明](../docs/running.md)。

## 动手练习

1. 保存到自己的 `.learn-dsh/session.jsonl`，查看 `message` 与 `request` 的区别。
2. 删除日志末尾换行，或把一个 `seq` 改成 99；确认加载显式失败。
3. 加载后再进行一轮交互，确认请求包含旧消息，且新事件序号接续。

完成标准：可以从磁盘恢复同一段消息历史，并在不修改旧事件的情况下续聊。

## 与真实 dsh 的对应

这是课程自己的 JSONL 快照格式，不能用来读写官方 Session。官方还处理流式事件、分支、持久化兼容与资源引用等问题；本课只展示记录与投影的分离。详见[源码对应表](../docs/official-map.md)。
