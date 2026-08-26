---
blog: true
title: "04-LLM协议适配层：Provider-Neutral → Provider-Specific"
slug: "04-llm协议适配层-provider-neutral-provider-specific-mscuwj4i"
summary: "树节点：04 LLM协议适配层 父节点：04 全链路概览 子节点：无 04 LLM协议适配层：Provider Neutral → Provider Specific @opencode ai/llm 包实现了一套 Schema first 的 LLM 抽象层，将通用的 LLMRequest 转化为各个 Provider 的原生 HTTP 请求。 一、顶层 API — llm.ts 文件 : packages/llm/src/llm.t"
date: 2026-08-03
category: "Opencode手撕代码"
featured: false
---

> 树节点：04-LLM协议适配层
> 父节点：[[04-全链路概览]]
> 子节点：无

# 04-LLM协议适配层：Provider-Neutral → Provider-Specific

`@opencode-ai/llm` 包实现了一套 Schema-first 的 LLM 抽象层，将通用的 `LLMRequest` 转化为各个 Provider 的原生 HTTP 请求。

---

## 一、顶层 API — llm.ts

**文件**: `packages/llm/src/llm.ts` (186 行)

### LLM.request() — 构建统一请求

```ts
// llm.ts:53-75
const request = (input: RequestInput) => new LLMRequest({
  system: SystemPart.content(requestSystem),       // 字符串 → SystemPart[]
  messages: [...messages, ...(prompt ? [Message.user(prompt)] : [])],
  tools: tools?.map(ToolDefinition.make) ?? [],
  toolChoice: requestToolChoice ? ToolChoice.make(requestToolChoice) : undefined,
  generation: GenerationOptions.make(requestGeneration),
  providerOptions, http, cache, ...
})
```

`RequestInput` 是用户友好的输入类型（`system: string`、`prompt: string | ContentPart[]`），`request()` 做标准化工作。

### LLM.generateObject() — 结构化输出

通过**伪造一个工具调用**来实现 provider 无关的结构化 JSON 输出 (`:110-186`)：

```ts
// llm.ts:110-144
const runGenerateObject = (options, tool) => {
  const generateRequest = LLMRequest.update(baseRequest, {
    tools: toDefinitions({ generate_object: tool }),
    toolChoice: ToolChoice.named("generate_object"),
  })
  const response = yield* LLMClient.generate(generateRequest)
  // 解码第一个 generate_object 调用的输入
}
```

两种输入模式：
- **Typed** (`schema: ToolSchema<T>`) → 返回 `T` 类型
- **Dynamic** (`jsonSchema: JsonSchema`) → 返回 `unknown`，适合 MCP 动态 schema

### 导出

`generate` 和 `stream` 直接从 `LLMClient` re-export (`:45-47`)：

```ts
export const generate = LLMClient.generate
export const stream = LLMClient.stream
```

---

## 二、Route 系统 — 四轴组合

**文件**: `packages/llm/src/route/client.ts` (436 行)

### Route.make() 四轴模型

```ts
// client.ts:303-339
Route.make({
  id: "openai-chat",           // 路由标识
  provider: "openai",
  protocol: OpenAIChat.protocol,     // ← 语义 API 契约
  endpoint: Endpoint.path("/chat/completions", { baseURL }),
  auth: Auth.bearer(),              // ← 认证
  framing: Framing.sse,             // ← 字节→帧解析
  headers, defaults,
})
```

**关键理念**：这四轴分离使得 DeepSeek、TogetherAI、Groq 等兼容提供商可以**直接复用** `OpenAIChat.protocol`，每个只需 5-15 行 `Route.make()` 配置（见 `providers/openai-compatible.ts`）。

| 轴 | 负责 | 文件 |
|----|------|------|
| `Protocol` | Request body 构建 + Stream 解析 | `route/protocol.ts` |
| `Endpoint` | URL 构建 (host, path, query) | `route/endpoint.ts` |
| `Auth` | 每请求认证 (bearer, header, 签名) | `route/auth.ts` |
| `Framing` | 字节流 → 协议帧 (SSE, AWS event-stream) | `route/framing.ts` |

### Route 方法

| 方法 | 用途 |
|------|------|
| `route.with(patch)` | 派生 route（覆盖 auth、endpoint、defaults） |
| `route.model(id)` | 基于此 route 创建 `Model` 值 |
| `route.prepareTransport(body, request)` | 构建 HTTP 请求对象 |

### LLMClient 主要方法

**文件**: `packages/llm/src/route/client.ts`

| 方法 | 行号 | 功能 |
|------|------|------|
| `prepare<Body>(request)` | :361-372 | 编译请求但不发送，返回 `PreparedRequest` |
| `stream(request)` | :396-402 | 流式返回 `Stream<LLMEvent, LLMError>` |
| `generate(request)` | :404-408 | 收集 stream 为 `LLMResponse` |

**核心编译流程** (`:344-359`):

```ts
const compile = (request) => {
  const resolved = applyCachePolicy(resolveRequestOptions(request))  // 层级合并
  const body = yield* route.body.from(resolved)                       // 协议 → provider body
  const prepared = yield* route.prepareTransport(body, resolved)      // 构建 HTTP
}
```

**Stream 处理** (`:374-380`):

```ts
const streamRequestWith = (runtime) => (request) =>
  Stream.unwrap(Effect.gen(function*() {
    const compiled = yield* compile(request)
    return compiled.route.streamPrepared(compiled.prepared, compiled.request, runtime)
  }))
```

`streamPrepared` (`:279-295`) 管道：`transport.frames → decodeEvent → terminal? → mapAccumEffect(initial, step, onHalt?) → catchCause(error → streamError)`。

---

## 三、Protocol 层 — 六个协议适配器

**目录**: `packages/llm/src/protocols/`

| 协议文件 | 行数 | 对应回 API |
|---------|------|-----------|
| `openai-chat.ts` | 506 | OpenAI Chat Completions (GPT-4, GPT-4o) |
| `openai-responses.ts` | - | OpenAI Responses API (新的 structured responses) |
| `anthropic-messages.ts` | 855 | Anthropic Messages API (Claude) |
| `gemini.ts` | - | Google Gemini `generateContent` |
| `bedrock-converse.ts` | - | AWS Bedrock Converse |
| `openai-compatible-chat.ts` | - | 通用兼容层（复用 `OpenAIChat.protocol`） |

### Protocol 接口

```ts
// route/protocol.ts:36-60
interface Protocol<Body, Frame, Event, State> {
  id: ProtocolID
  body: ProtocolBody<Body>       // schema + from(request) → provider body
  stream: ProtocolStream<Frame, Event, State>
}
interface ProtocolStream<Frame, Event, State> {
  event: Schema.Codec<Event, Frame>                                // 单帧解码
  initial: (request: LLMRequest) => State                          // 初始解析器状态
  step: (state: State, event: Event) => Effect<[State, LLMEvent[]]>  // 状态机步进
  terminal?: (event: Event) => boolean                             // 可选终止信号
  onHalt?: (state: State) => State                                 // 流终止后 flush
}
```

### 协议文件结构（以 `openai-chat.ts` 为例）

```
1. Request Body Schema (OpenAIChatBody)           // provider-native JSON
2. Streaming Event Schema (OpenAIChatStreamEvent) // provider SSE 事件
3. Parser State (OpenAIChatState)                 // 累积 finish reason, usage, tool calls
4. fromRequest()                                  // LLMRequest → OpenAIChatBody
5. step() + per-event handlers                    // provider event → LLMEvent[]
6. protocol 常量                                   // Protocol<...>
7. route 常量（使用 Route.make()）
```

每个协议文件自成体系，遵循相同顺序，便于并排对比审查。

### 共享工具包

`packages/llm/src/protocols/shared.ts` — `ProviderShared` 命名空间：
- `joinText(parts)` — 合并 TextPart 数组
- `parseToolInput(route, name, raw)` — JSON 解码工具参数
- `eventError(route, message, ...)` — 构建 `InvalidProviderOutput` 错误
- `validateWith(decoder)` — Schema 验证包装
- `matchToolChoice(provider, choice, branches)` — 工具选择分支分发

子目录 `utils/`：
- `cache.ts` — Anthropic/Bedrock cache 标记插入
- `lifecycle.ts` — 生命周期（HTTP 头生成）
- `tool-stream.ts` — 流式工具参数累积
- `tool-schema.ts` — Schema 投影
- `openai-options.ts` — OpenAI 特有选项

---

## 四、Provider 层 — 12 个提供商外观

**目录**: `packages/llm/src/providers/`

| 提供商文件 | 模型选择器 | 说明 |
|-----------|-----------|------|
| `openai.ts` | `.chat()`, `.responses()`, `.responsesWebSocket()` | OpenAI 三条 API 路径 |
| `anthropic.ts` | `.model()` | Anthropic Claude |
| `google.ts` | `.model()` | Google Gemini |
| `amazon-bedrock.ts` | `.model()` | AWS Bedrock（SigV4 签名） |
| `azure.ts` | `.responses()` | Azure OpenAI |
| `cloudflare.ts` | 两个外观: `CloudflareAIGateway` / `CloudflareWorkersAI` | Cloudflare AI |
| `github-copilot.ts` | `.model()` | GitHub Copilot |
| `openrouter.ts` | `.model()` | OpenRouter |
| `xai.ts` | `.model()` | xAI Grok |
| `openai-compatible.ts` | `.model()` | 通用兼容（DeepSeek, Groq, Together 等） |
| `openai-compatible-profile.ts` | - | 预设模板（deepseek, togetherai 等） |

### Provider 外观模式

```ts
const openai = OpenAI.configure({ apiKey }).responses("gpt-4o-mini")
// openai 是 Model 值，携带 route 引用
// 调用时: LLMClient.stream(request({ model: openai, ... }))
```

配置设置三元组：
1. **`configure({ apiKey, ... })`** → 设置凭证、端点
2. **`.responses(id)` / `.chat(id)` / `.model(id)`** → 选择 API 路径和模型
3. 内部使用 `route.with({ auth, endpoint })` 覆盖路由

**两种构造方式**：
- 外观模式（推荐）：`OpenAI.configure({ apiKey }).responses("gpt-4o")`
- 底层接口：`Provider.make({ id, routes })` — 用于简单静态定义

---

## 五、请求流程：从 LLMRequest 到 Provider HTTP Call

```
LLM.request({ model: openAI.responses("gpt-4o"), system: "...", prompt: "..." })
  │
  ▼  构建 LLMRequest Schema 实例
  │
LLMClient.stream(request)
  │
  ├── resolveRequestOptions(request)
  │   └── 合并: route.defaults > model.defaults > request 级别
  │
  ├── applyCachePolicy(resolved)
  │   └── cache: "auto" → 自动放置 3 个缓存断点（若协议支持）
  │
  ├── route.body.from(resolved)
  │   └── Protocol.fromRequest() → provider-native body (OpenAIChatBody / AnthropicMessagesBody / ...)
  │
  ├── route.body.schema → Schema.validate
  │   └── 验证 provider body 符合协议 Schema
  │
  ├── route.prepareTransport(body, request)
  │   ├── Auth: 在 headers 中设置 Authorization
  │   ├── Endpoint: 构造完整 URL
  │   └── Transport: 构建 HttpClientRequest（JSON body + headers）
  │
  ├── RequestExecutor: 发送 HTTP 请求
  │   └── 通过 Effect/HttpClient 发送
  │
  └── route.streamPrepared(prepared, request, runtime)
      ├── Transport.frames → Stream<Frame>  (SSE: 按 \n\n 分割)
      ├── Stream.mapEffect(decodeEvent)     (Frame → Event, Schema 解码)
      ├── protocol.stream.terminal? → takeUntil (终止条件)
      └── Stream.mapAccumEffect(initial, step)  (状态机: Event → LLMEvent[])
           │
           └── [text-delta, tool-call, tool-result, finish, provider-error, ...]
```

### 选项合并层级

三级配置在 `resolveRequestOptions()` (`client.ts:167-180`) 中合并：

```
route.defaults  (Route.make 时设置)
    │
    ▲  被覆盖
model.defaults  (provider 外观创建模型时设置)
    │
    ▲  被覆盖
request 级别    (LLM.request() 调用时传入)
```

每个轴独立合并：`generation`、`providerOptions`、`http`（headers 叠加）。

---

## 六、消息 Schema — 规范数据模型

**文件**: `packages/llm/src/schema/messages.ts` (312 行)

### 核心类型

```ts
SystemPart = { type: "text", text: string, cache?: CacheHint, metadata?: ... }
Message = { id?, role: "user"|"assistant"|"system"|"tool", content: ContentPart[], ... }
LLMRequest = { id?, model, system: SystemPart[], messages: Message[], tools: ToolDefinition[], ... }
ToolDefinition = { name, description, inputSchema: JsonSchema, outputSchema?, ... }
ToolChoice = { type: "auto"|"none"|"required"|"tool", name? }
```

**`ContentPart`** 联合类型 (`:178-181`)：

```ts
TextPart | MediaPart | ToolCallPart | ToolResultPart | ReasoningPart
```

### Message 工厂方法

```ts
// messages.ts:203-221
Message.user(content)        → { role: "user", ... }
Message.assistant(content)   → { role: "assistant", ... }
Message.system(content)      → 时间线上的系统指令（非初始 system prompt）
Message.tool(result)         → { role: "tool", content: [ToolResultPart] }
```

**关键区分**：
- `LLMRequest.system` — 初始 system prompt（每个请求开始时注入）
- `Message.system(...)` — **时间线上的**操作者指令（插入到消息历史特定位置）

---

## 七、工具系统 — Tool Schema

**文件**: `packages/llm/src/tool.ts` (253 行) — Typed tool schema

```ts
// tool.ts:48-69
interface Tool<Parameters, Success> {
  description: string
  parameters: ToolSchema<Parameters>    // 输入 Schema
  success: ToolSchema<Success>           // 输出 Schema
  execute?: ToolExecute<Parameters, Success>  // 执行器（可选）
  // @internal
  _decode, _encode, _project, _definition
}
```

**两种构造模式** (`:133-164`)：

1. **Typed** — `{ description, parameters, success, execute }`：
   ```ts
   Tool.make({
     parameters: Schema.Struct({ city: Schema.String }),
     success: Schema.Struct({ temperature: Schema.Number }),
     execute: ({ city }) => Effect.succeed({ temperature: 22 }),
   })
   ```

2. **Dynamic** — `{ description, jsonSchema, execute }`：
   ```ts
   Tool.make({
     jsonSchema: { type: "object", properties: { city: { type: "string" } } },
     execute: (params) => Effect.succeed({ temperature: 22 }),
   })
   ```

**工具错误处理**：只能返回 `ToolFailure`（可恢复，模型可自修正）。其他异常视为 defect。

---

## 八、Route 传输层

**目录**: `packages/llm/src/route/transport/`

| 传输 | 文件 | 用途 |
|------|------|------|
| `HttpTransport.httpJson` | `transport/http.ts` | 标准 HTTP POST + JSON body + framing |
| `WebSocketTransport.json` | `transport/websocket.ts` | WebSocket 连接（OpenAI Responses 后端） |

`HttpTransport.httpJson({ framing })` 返回一个 `Transport<Body, HttpPrepared<Frame>>`：
- `prepare({ body, endpoint, auth, headers })` → 构建 `HttpClientRequest`
- `frames(prepared, request, runtime)` → `Stream<Frame>`（拆帧）

---

## 九、缓存策略

**文件**: `packages/llm/src/cache-policy.ts`

默认 `cache: "auto"` 策略：在三个位置插入缓存标记：
1. 最后一个工具定义的尾部
2. 最后一个 system part 的尾部
3. 最后一个 user message 的尾部

**Provider 行为表**：

| 协议 | `"auto"` 行为 |
|------|-------------|
| Anthropic Messages | 发出最多 3 个 `cache_control` 标记 |
| Bedrock Converse | 发出 `cachePoint` 块（类比 Anthropic） |
| OpenAI Chat / Responses | no-op（OpenAI 服务端隐含缓存） |
| Gemini | no-op（Gemini 2.5+ 隐含缓存） |

---

## 十、关键文件索引

| 文件 | 行数 | 说明 |
|------|------|------|
| `packages/llm/src/llm.ts` | 186 | 顶层 API：request, generateObject |
| `packages/llm/src/route/client.ts` | 436 | Route.make, LLMClient.prepare/stream/generate, compile |
| `packages/llm/src/route/protocol.ts` | 84 | Protocol 接口定义 |
| `packages/llm/src/route/endpoint.ts` | - | Endpoint URL 构建 |
| `packages/llm/src/route/auth.ts` | - | Auth 抽象（bearer, header, passthrough） |
| `packages/llm/src/route/framing.ts` | - | SSE / binary 帧解析 |
| `packages/llm/src/route/transport/http.ts` | - | HTTP JSON transport |
| `packages/llm/src/schema/messages.ts` | 312 | Message, SystemPart, LLMRequest, ToolDefinition |
| `packages/llm/src/schema/events.ts` | - | LLMEvent, LLMResponse, Usage |
| `packages/llm/src/schema/errors.ts` | - | LLMError, ToolFailure |
| `packages/llm/src/schema/options.ts` | - | GenerationOptions, Model, ProviderOptions, HttpOptions |
| `packages/llm/src/tool.ts` | 253 | Tool.make, toDefinitions |
| `packages/llm/src/tool-runtime.ts` | - | ToolRuntime.dispatch |
| `packages/llm/src/cache-policy.ts` | - | 缓存策略和断点放置 |
| `packages/llm/src/protocols/openai-chat.ts` | 506 | OpenAI Chat 协议 |
| `packages/llm/src/protocols/anthropic-messages.ts` | 855 | Anthropic Messages 协议 |
| `packages/llm/src/protocols/gemini.ts` | - | Gemini 协议 |
| `packages/llm/src/protocols/bedrock-converse.ts` | - | Bedrock Converse 协议 |
| `packages/llm/src/protocols/shared.ts` | - | ProviderShared 工具包 |
| `packages/llm/src/providers/openai.ts` | - | OpenAI 外观 |
| `packages/llm/src/providers/anthropic.ts` | - | Anthropic 外观 |
| `packages/llm/src/providers/openai-compatible.ts` | - | 通用 OpenAI 兼容 |
