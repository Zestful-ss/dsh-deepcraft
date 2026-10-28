# 同一个模型，omp、magpie、dsh 的 tok/s 为什么不同？ {#token-rate}

三个数不是同一把尺子：**omp 量当前消息的滑动窗口，dsh 量整个会话的 decode 时间，magpie 量正文写入速度**。同一个模型、同一次请求，读数也可以差一倍。

- omp 从请求开始计时，TTFT 在分母里。
- dsh 从首个 token 计时，整个会话的 token 与时间分别累加。
- magpie 从首个正文计时，有 reasoning 时把 reasoning token 从分子扣掉。
- 三者对短流、突发流、舍入的处理也不同。

@answer scope="omp 18.13.2 · dsh 0.2.1-rc.3 · magpie 0.1.1818 · 本机安装包源码"
@meta locale=zh-CN

## 三者各算了什么？ {#formulas}

| 项目 | omp composer | dsh activity pill | magpie Speed |
| --- | --- | --- | --- |
| 统计范围 | 当前消息的滑动窗口；结束后保留上一读数 | 整个会话已完成的 step；Timing 面板是单次请求 | 单条 reply；分组时汇总已测量 reply |
| 分子 | 流式 text、thinking、tool-call delta 的本地 tokenizer 计数；完成时用 provider `usage.output` 校正 | provider `usage.outputTokens`，代码不扣 reasoning | 有正文时 `output − reasoning`；无正文但有可见 reasoning 时用全部 output |
| 分母 | 请求开始到结束；含 TTFT 与 reasoning 时间；工具执行不计时 | 首个 token delta 到消息结束；不含 TTFT 与工具执行 | 首个正文或首个可见 reasoning 到结束；不含 TTFT 与 reasoning 时间 |
| 聚合 | `Σtokens / Σtime`，5s、20s、80s 三个半衰期窗口相加 | `ΣdecodeTokens / ΣdecodeMs` | `Σdecode_out / Σdecode_ms` |
| 过滤 | 不足 200 token 或 4s 不显示 | 没有首 token 或没有 usage 的 step 跳过 | 窗口不足 100ms、快于 10,000 tok/s、内容被压到最后释放时不给速度 |
| 精度 | 0.1 | 小于 10 保留 1 位，10 及以上取整 | 整数；无法测量的行显示 `≥` 下限 |

## 同一个请求会差多少？ {#example}

构造一次请求：TTFT 2s，正文 1,000 tokens 用 10s；另一版再加 2,000 reasoning tokens 用 20s。

| 场景 | omp | dsh | magpie | 差异来源 |
| --- | --- | --- | --- | --- |
| 只有正文 | 87 | 100 | 100 | omp 的分母含 2s TTFT |
| 加 reasoning | 101 | 105 | 200 | magpie 扣掉 reasoning 和它的时间 |

@callout id=example-arithmetic level=note title="第二行怎么算"
dsh：2,200 ÷ 21s = 104.8，显示 105；magpie：200 ÷ 1s = 200；omp：按 `TokenRateMeter` 源码对构造的 delta 序列计算，三窗口衰减和为 101。

omp 的数由源码按构造的 token 到达节奏计算，真实读数随 tokenizer 与到达节奏变化。

## 网络慢时谁的数会掉？ {#network}

同样 1,000 output tokens 用 10s 写完，只改 TTFT：

| TTFT | omp | dsh | magpie |
| --- | --- | --- | --- |
| 0.2s | 99 | 100 | 100 |
| 2s | 87 | 100 | 100 |
| 8s | 64 | 100 | 100 |

omp 的分母从请求开始算，TTFT 越长，读数掉得越多；dsh 与 magpie 从首个 token 或首个正文算，网络慢不进入它们的 tok/s。用户等首 token 的时间，只有 omp 的读数部分反映。

## omp 的实时读数为什么自己会变？ {#omp-meter}

composer 的 Generation Rate 来自 `TokenRateMeter`，不是简单的 `output / 总时长`。

- 5s、20s、80s 三个半衰期窗口分别累计 token 与时间，读数取三个窗口的 `Σtokens / Σtime`；近期 token 权重更高。
- 流式 text、thinking、tool-call delta 先按本地 tokenizer 计数；provider 计费但未流式发送的 token（隐藏 reasoning、工具调用信封）按隐藏 token 速率补进窗口。
- 计时从消息的请求开始时间戳到 `timestamp + duration`，TTFT 也在分母里；消息之间的工具执行不计时。
- 消息完成后把 provider 的差额按时间权重摊回窗口；读数随后保持不变，直到下一条消息混入或 `reset` 清空。

@callout id=omp-second-path level=note title="omp 还有第二条路径"
`calculateTokensPerSecond` 用 `output / duration`，duration 含 TTFT，门槛 100ms；状态栏的整条消息读数用它。composer 的 Generation Rate 用 `TokenRateMeter`，两者不能直接对比。

## dsh 的会话读数为什么不能跟单条比？ {#dsh}

ActivityPill 显示整个会话的 decode 速度，不是最后一条回复的速度。

- 每个 step 的首个 token delta 记录首 token 时间；消息完成时用 `completedTime − firstTokenTime` 累加 decode 时间，用 `usage.outputTokens` 累加 token。
- 没有首 token 或没有 usage 的 step 不进入分子和分母；取消的 step 也没有计时。
- 多个 step 的 token 与时间分别求和后再相除，所以它按 decode 时间加权，不是每条速度的平均。
- 单次请求的 Timing 面板用同一个公式：`outputTokens / (completedTime − firstTokenTime)`。

## magpie 为什么要扣 reasoning，还会显示 ≥？ {#magpie}

`usage.DecodeOf` 把速度限定为正文的写入速度。

- 有 reasoning 且有正文时，分子改为 `output − reasoning`，分母从首个正文 token 开始；reasoning 的时间归到首 token 等待里。
- 没有正文、但有可见 reasoning 且流式到达时，才用全部 output，并从首个 reasoning token 开始计时。
- 窗口不足 100ms、快于 10,000 tok/s、内容到达只用了窗口不到四分之一的时间，都不给速度。
- 正文速度超过 reasoning 的 20 倍，也判定为被压到最后释放。
- 会话文件没有首 token 时，只给一个 `≥` 下限，并且不计入分组的 `Speed`；带 `≥` 的数不能当成实测值。

## 工具调用占时，tok/s 还能代表体感吗？ {#tools}

三个 step，每步 2s 写出 400 tokens，随后工具跑 10s：

| 口径 | 读数 |
| --- | --- |
| omp、dsh、magpie 的 tok/s | 约 200 |
| 端到端 tokens ÷ 总墙钟 | 1,200 ÷ 36s = 33 |

三处 tok/s 都只算模型写 token 的时间，工具执行被排除。omp 在工具运行期间保持上一条消息的读数。

dsh 的统计面板另列 tool time。magpie 的 Speed 只算单条 reply。任务里的工具越多，这个 tok/s 越不能代表你等任务完成的速度。

## 哪个数更接近真实体验？ {#experience}

- 单条回复的等待：omp 最接近。TTFT 在分母里，读数实时更新；不足 4s 或 200 token 时它不显示。
- reasoning 模型的完整生成：dsh 更接近。reasoning 与正文都算在 decode 时间里；magpie 只算正文，会显得更快。
- 纯模型写入速度：magpie 最干净。它排除了 reasoning、TTFT 和突发流。
- agent 任务的总时长：三个都不够。用总 output tokens 除以总墙钟，工具时间和网络等待都要算进去；dsh 的面板能分开看 LLM time 与 tool time。

## 对比时先确认什么？ {#checklist}

- [ ] 两个数是否都包含 TTFT：omp 包含，dsh 与 magpie 不包含。
- [ ] reasoning 是否在分子里：dsh 包含，magpie 扣除，omp 先估算再按 provider 计费校正。
- [ ] 统计范围是否相同：omp 是当前消息窗口，dsh 是整个会话，magpie 是单条或分组。
- [ ] magpie 的数是否带 `≥`：带 `≥` 的是下限，不是实测。
- [ ] 比较同一请求、同一时间段；不要拿 omp 的实时读数对 dsh 的会话累计。

## 源码位置 {#sources}

| 工具 | 位置 | 关键函数 |
| --- | --- | --- |
| omp | [token-rate.ts](https://github.com/can1357/oh-my-pi/blob/main/packages/coding-agent/src/utils/token-rate.ts) | `calculateTokensPerSecond`、`TokenRateMeter` |
| dsh session-stats | `@deepseek-ai/dsh-session-stats/lib/index.js` | `assistant/message` 折叠 |
| dsh ui-chat | `@deepseek-ai/dsh-client-ui-chat/lib/client.js` | `ActivityPill`、`decodeSpeed` |
| dsh ui-trajectory | `@deepseek-ai/dsh-client-ui-trajectory/lib/client.js` | `generationSeconds` |
| magpie usage | [usage.go](https://github.com/yetone/magpie/blob/main/internal/usage/usage.go) | `Totals.Speed`、`DecodeWindow`、`DecodeOf` |
| magpie usage page | [page.js](https://github.com/yetone/magpie/blob/main/internal/gui/assets/plugins/usage/page.js) | `ledDecode`、`ledRowSpeed`、`ledGroupSpeed` |
