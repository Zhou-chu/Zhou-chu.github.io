---
blog: true
title: "LLMGW 本地 LLM 网关 — 工程开发文档 v3.0"
slug: "llmgw-local-llm-gateway"
summary: "面向 AI 开发 Agent 的可执行工程规格：基于 Rust 全栈核心（Tauri 2 + Rust 数据面 + React UI）的本地 LLM 网关。"
date: 2026-09-03
category: "LLMGW 网关"
featured: false
tags:
  - "LLM网关"
  - "Rust"
  - "Tauri"
  - "工程文档"
---

# LLMGW 本地 LLM 网关 — 工程开发文档 v3.0

> **文档性质**：直接面向 AI 开发 Agent 的可执行工程规格
> **版本**：v3.0 · 2026-09-03
> **架构决策**：Rust 全栈核心（Tauri 2 + Rust 数据面 + React UI）


---
## 目录

1. [项目概述与架构](#1-项目概述与架构)
2. [技术栈与依赖](#2-技术栈与依赖)
3. [项目目录结构](#3-项目目录结构)
4. [数据模型与数据库 Schema](#4-数据模型与数据库-schema)
5. [核心类型定义](#5-核心类型定义)
6. [模块接口规范](#6-模块接口规范)
7. [API 规范](#7-api-规范)
8. [核心流程定义](#8-核心流程定义)
9. [错误处理体系](#9-错误处理体系)
10. [测试策略](#10-测试策略)
11. [开发任务拆解](#11-开发任务拆解)
12. [验收标准](#12-验收标准)


---
## 1. 项目概述与架构


### 1.1 产品定位

本地运行的 LLM 流量网关桌面应用。为个人电脑上的长程 Agent（Claude Code / OpenCode / Codex / DeepSeek Harness 等）提供统一、可路由、可观测的 LLM 调用出口。


### 1.2 架构总览

```
┌─────────────────────────────────────────────────┐
│                  Tauri 2 应用                    │
│  ┌──────────────┐      ┌──────────────────────┐ │
│  │  React UI    │◄────►│  Rust 核心（数据面）   │ │
│  │  (前端面板)   │ HTTP │  - HTTP 服务器 8787   │ │
│  │              │ 8788 │  - HTTP 服务器 8788   │ │
│  └──────────────┘      │  - 路由引擎           │ │
│         ▲              │  - 协议适配           │ │
│         │ Tauri IPC    │  - 计费/预算          │ │
│         │ (窗口/托盘/   │  - 健康检测           │ │
│         │  密钥/自启)   │  - SQLite 存储        │ │
│                        └──────────┬───────────┘ │
│                                   │              │
│                         ┌─────────▼─────────┐   │
│                         │  SQLite (WAL模式)  │   │
│                         └───────────────────┘   │
└─────────────────────────────────────────────────┘
          │                    │
    ┌─────▼─────┐        ┌─────▼─────┐
    │ 8787 消费者 │        │ 8788 管理  │
    │ (LLM 调用) │        │ (UI 操作)  │
    └───────────┘        └───────────┘
```

### 1.3 进程与生命周期

- **进程模型**：单进程。Rust 在 Tauri 启动时初始化所有子系统。
- **HTTP 服务器**：使用 `tokio` + `axum`，在应用启动时绑定。
  - `127.0.0.1:8787` — 消费者 API（OpenAI 兼容）
  - `127.0.0.1:8788` — 管理 API（仅回环 + 随机 token）
- **窗口关闭策略**：默认最小化到托盘，保持 HTTP 服务器运行。用户可在设置中修改。
- **优雅关闭**：监听 `tauri::RunEvent::Exit`，执行：
  1. 停止健康检测调度器
  2. 取消所有 in-flight 上游请求
  3. 关闭 HTTP 服务器
  4. 执行 SQLite checkpoint 并关闭连接池


### 1.4 数据流

```
消费者 → 8787 → 鉴权 → 限流 → 熔断检查 → 协议解析 → Canonical IR
    → 路由引擎（Stage 链 / race）→ 出口层（代理、上游调用）
    → 协议转换 → SSE 直通 → 消费者

旁路异步：
  - 计费引擎：每次尝试后更新 token 计数、费用
  - 日志/指标：每次尝试写入 structured log
  - 健康检测：定时器触发 L0/L1 探针
  - 事件推送：gateway.notice SSE → /v1/events 订阅者
```

---
## 2. 技术栈与依赖


### 2.1 Rust 依赖（`src-tauri/Cargo.toml`）

```toml
[dependencies]
# 异步运行时与 HTTP
tokio = { version = "1.40", features = ["full"] }
axum = { version = "0.7", features = ["ws", "macros"] }
tower = "0.5"
tower-http = { version = "0.6", features = ["cors", "trace", "timeout", "limit"] }
hyper = "1"

# 数据库
sqlx = { version = "0.8", features = ["runtime-tokio", "sqlite", "chrono", "uuid", "migrate"] }

# HTTP 客户端（上游调用）
reqwest = { version = "0.12", features = ["json", "stream", "socks", "rustls-tls", "gzip"] }

# 序列化
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# 日志与追踪
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["json", "env-filter"] }
tracing-appender = "0.2"

# 密钥存储（OS keychain）
keyring = "3"

# 工具
chrono = { version = "0.4", features = ["serde", "clock"] }
uuid = { version = "1", features = ["v4", "serde"] }
thiserror = "2"
parking_lot = "0.12"
arc-swap = "1"
futures = "0.3"
async-stream = "0.3"
async-trait = "0.1"
rand = "0.8"
statistical = "1"  # 用于 MAD 计算
regex = "1"

# Tauri 2
tauri = { version = "2", features = ["tray-icon", "protocol-asset"] }
tauri-plugin-shell = "2"
tauri-plugin-autostart = "2"
tauri-plugin-updater = "2"
tauri-plugin-notification = "2"
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
tauri-plugin-os = "2"

[dev-dependencies]
mockito = "1"          # Mock 上游服务
tempfile = "3"
proptest = "1"         # 属性测试
criterion = "0.5"      # 基准测试
```

### 2.2 前端依赖（`package.json`）

```json
{
  "dependencies": {
    "react": "^18.3",
    "react-dom": "^18.3",
    "react-router-dom": "^6.26",
    "zustand": "^4.5",
    "@tanstack/react-query": "^5",
    "recharts": "^2.12",
    "tailwindcss": "^3.4",
    "lucide-react": "^0.4",
    "date-fns": "^3",
    "clsx": "^2"
  },
  "devDependencies": {
    "typescript": "^5.5",
    "vite": "^5",
    "@vitejs/plugin-react": "^4",
    "vitest": "^2"
  }
}
```

### 2.3 数据库

SQLite 3.45+，WAL 模式，`foreign_keys = ON`，`busy_timeout = 5000`。


---
## 3. 项目目录结构

```
llmgw/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── migrations/
│   │   ├── 0001_init.sql
│   │   ├── 0002_routes.sql
│   │   └── ...
│   └── src/
│       ├── main.rs              # 入口：Tauri Builder + 子系统初始化
│       ├── error.rs             # 统一错误类型 LlmgwError + FailureClass
│       ├── config.rs            # 全局配置加载/存储
│       ├── state.rs             # AppState（共享状态容器）
│       │
│       ├── db/
│       │   ├── mod.rs           # 连接池初始化、migration 执行
│       │   ├── models.rs        # 所有数据库实体 struct
│       │   ├── providers.rs     # Provider CRUD
│       │   ├── credentials.rs   # Credential CRUD
│       │   ├── endpoints.rs     # Endpoint CRUD
│       │   ├── routes.rs        # Route + Stage + Candidate CRUD
│       │   ├── logs.rs          # 日志查询
│       │   ├── rollups.rs       # 聚合数据查询
│       │   ├── health.rs        # 健康检测数据
│       │   └── billing.rs       # 计费数据
│       │
│       ├── protocol/
│       │   ├── mod.rs           # Canonical IR 定义
│       │   ├── openai.rs        # OpenAI ⇄ IR 双向转换
│       │   ├── anthropic.rs     # Anthropic ⇄ IR 双向转换
│       │   ├── gemini.rs        # Gemini ⇄ IR 双向转换
│       │   └── tests/           # 往返转换测试
│       │       ├── openai_roundtrip.rs
│       │       └── anthropic_roundtrip.rs
│       │
│       ├── server/
│       │   ├── mod.rs           # 服务器启动/关闭
│       │   ├── consumer.rs      # 8787 消费者 API handlers
│       │   ├── admin.rs         # 8788 管理 API handlers
│       │   ├── sse.rs           # SSE 流处理辅助
│       │   └── middleware.rs    # 鉴权、限流、CORS
│       │
│       ├── routing/
│       │   ├── mod.rs           # RouteEngine 核心
│       │   ├── stage.rs         # Stage 执行器（single/race）
│       │   ├── failure.rs       # 四层失败判定
│       │   ├── circuit_breaker.rs # 熔断器
│       │   ├── cooldown.rs      # 冷却管理
│       │   └── attribution.rs   # 故障归因
│       │
│       ├── egress/
│       │   ├── mod.rs           # 出口层：上游调用封装
│       │   ├── transport.rs     # 代理、TLS、连接池
│       │   └── adapters/
│       │       ├── mod.rs       # ProviderAdapter trait
│       │       ├── openai.rs
│       │       ├── anthropic.rs
│       │       ├── gemini.rs
│       │       └── generic.rs   # 通用 OpenAI 兼容适配器（中转站）
│       │
│       ├── billing/
│       │   ├── mod.rs           # 计费引擎
│       │   ├── pricing.rs       # 价格管理
│       │   ├── quota.rs         # Coding Plan 额度双轨
│       │   ├── budget.rs        # 三级预算熔断
│       │   └── rate_limit.rs    # RPM/TPM/并发限流
│       │
│       ├── cache/
│       │   ├── mod.rs           # 缓存子系统
│       │   ├── prefix.rs        # 公共前缀分析
│       │   ├── inject.rs        # cache_control 注入
│       │   └── gateway_cache.rs # 网关侧精确缓存（默认关闭）
│       │
│       ├── health/
│       │   ├── mod.rs           # 健康检测管理器
│       │   ├── probes.rs        # L0/L1/L2 探针定义
│       │   ├── baseline.rs      # 滑动基线 + MAD 漂移检测
│       │   ├── fingerprint.rs   # 响应指纹
│       │   └── scheduler.rs     # 定时调度
│       │
│       ├── observability/
│       │   ├── mod.rs           # 可观测性模块
│       │   ├── logger.rs        # 结构化日志
│       │   ├── metrics.rs       # 指标聚合
│       │   └── rollup.rs        # Rollup 任务
│       │
│       └── tauri_cmds.rs        # Tauri IPC 命令（窗口/托盘/密钥/导出）
│
├── src/                         # React 前端
│   ├── main.tsx
│   ├── App.tsx
│   ├── api/                     # 8788 管理 API 客户端
│   │   ├── client.ts            # fetch 封装（含 token）
│   │   ├── connections.ts
│   │   ├── routes.ts
│   │   ├── billing.ts
│   │   ├── logs.ts
│   │   ├── health.ts
│   │   └── config.ts
│   ├── stores/                  # Zustand stores
│   │   ├── connections.ts
│   │   ├── routes.ts
│   │   ├── billing.ts
│   │   ├── dashboard.ts
│   │   └── settings.ts
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Connections.tsx
│   │   ├── Routes.tsx
│   │   ├── Billing.tsx
│   │   ├── Logs.tsx
│   │   ├── Health.tsx
│   │   └── Settings.tsx
│   ├── components/
│   │   ├── layout/              # 布局组件
│   │   ├── charts/              # 图表组件（recharts 封装）
│   │   ├── tables/              # 数据表格
│   │   ├── dialogs/             # 对话框/表单
│   │   └── common/              # 通用组件
│   └── utils/
│       ├── format.ts            # 格式化工具
│       └── constants.ts
│
├── tests/                       # 集成测试（Rust）
│   ├── common/mod.rs            # 测试辅助
│   ├── routing_chain.rs         # 链式 fallback 集成测试
│   ├── routing_race.rs          # 并发 race 集成测试
│   ├── budget.rs                # 预算熔断测试
│   ├── cache_inject.rs          # cache_control 注入测试
│   ├── health.rs                # 健康检测测试
│   ├── consumer_api.rs          # 消费者 API 端到端测试
│   └── admin_api.rs             # 管理 API 测试
│
├── fixtures/                    # 测试 fixture
│   ├── mock_upstream/           # Mock 上游服务（模拟各家 API）
│   │   ├── openai_mock.py
│   │   ├── anthropic_mock.py
│   │   └── flaky_mock.py        # 模拟不稳定服务
│   └── prompts/                 # 测试 prompt 集
│       ├── l0_heartbeat.json
│       ├── l1_capability.json
│       └── l2_benchmark.json
│
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---
## 4. 数据模型与数据库 Schema


### 4.1 Migration `0001_init.sql`

```sql
-- 启用 WAL 模式
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- 服务商模板
CREATE TABLE providers (
    id              TEXT PRIMARY KEY,          -- slug: "openai", "anthropic", "deepseek", ...
    display_name    TEXT NOT NULL,
    protocol        TEXT NOT NULL,             -- "openai" | "anthropic" | "gemini" | "openai_compat"
    base_url        TEXT NOT NULL,             -- 默认 API base
    docs_url        TEXT,
    capabilities    TEXT NOT NULL DEFAULT '[]', -- JSON 数组: ["chat", "tools", "vision", "cache_control", ...]
    default_headers TEXT NOT NULL DEFAULT '{}', -- JSON 对象，额外请求头
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 代理策略
CREATE TABLE proxy_policies (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    kind        TEXT NOT NULL,                 -- "direct" | "system" | "custom"
    server      TEXT,                          -- socks5://host:port 或 http://host:port
    username    TEXT,
    password_ref TEXT,                         -- keychain 引用
    enabled     INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 凭证（一份 API Key + 计费模式 + 代理策略）
CREATE TABLE credentials (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    provider_id     TEXT NOT NULL REFERENCES providers(id),
    api_key_ref     TEXT NOT NULL,             -- OS keychain 中的密钥引用
    billing_mode    TEXT NOT NULL,             -- "api" | "plan"
    plan_name       TEXT,                      -- Coding Plan 名称（如 "DeepSeek Pro"）
    proxy_policy_id TEXT REFERENCES proxy_policies(id),
    group_name      TEXT,                      -- 分组标签
    tags            TEXT NOT NULL DEFAULT '[]', -- JSON 数组
    enabled         INTEGER NOT NULL DEFAULT 1,
    is_default      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Coding Plan 额度（双轨）
CREATE TABLE plan_quotas (
    id              TEXT PRIMARY KEY,
    credential_id   TEXT NOT NULL REFERENCES credentials(id) ON DELETE CASCADE,
    source          TEXT NOT NULL,             -- "api" | "manual" | "estimated"
    total_quota     REAL,                      -- 总额度（token 数或点数）
    used_quota      REAL NOT NULL DEFAULT 0,
    unit            TEXT NOT NULL DEFAULT 'token', -- "token" | "point" | "usd"
    conversion_rate REAL,                      -- 点数 → token 的转换系数
    period          TEXT NOT NULL,             -- "daily" | "weekly" | "monthly" | "total"
    valid_from      TEXT NOT NULL,
    valid_until     TEXT,
    confidence      REAL NOT NULL DEFAULT 1.0, -- 可信度 0-1
    last_sync_at    TEXT,
    raw_response    TEXT,                      -- API 返回的原始数据
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 模型定价
CREATE TABLE model_pricings (
    id              TEXT PRIMARY KEY,
    provider_id     TEXT NOT NULL REFERENCES providers(id),
    model_name      TEXT NOT NULL,
    input_price     REAL NOT NULL,             -- USD per 1M tokens
    output_price    REAL NOT NULL,
    cache_read_price REAL,                     -- USD per 1M tokens
    cache_write_price REAL,
    currency        TEXT NOT NULL DEFAULT 'USD',
    valid_from      TEXT NOT NULL,
    valid_until     TEXT,                      -- NULL 表示当前有效
    source          TEXT NOT NULL,             -- "official" | "manual" | "estimated"
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 可调用实例（凭证 × 模型）
CREATE TABLE endpoints (
    id              TEXT PRIMARY KEY,
    credential_id   TEXT NOT NULL REFERENCES credentials(id) ON DELETE CASCADE,
    provider_id     TEXT NOT NULL REFERENCES providers(id),
    model_name      TEXT NOT NULL,
    display_name    TEXT,
    max_tokens_cap  INTEGER,                   -- 模型最大 token 上限
    enabled         INTEGER NOT NULL DEFAULT 1,
    health_status   TEXT NOT NULL DEFAULT 'unknown', -- "healthy" | "degraded" | "down" | "unknown"
    response_fingerprint TEXT,                 -- 入网时记录的响应指纹
    cooldown_until  TEXT,                      -- 冷却截止时间
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(credential_id, model_name)
);

-- 路由（虚拟模型）
CREATE TABLE routes (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,      -- 虚拟模型名，如 "my-coding-route"
    display_name    TEXT NOT NULL,
    description     TEXT,
    enabled         INTEGER NOT NULL DEFAULT 1,
    sticky_session  INTEGER NOT NULL DEFAULT 0, -- 粘滞会话
    notify_mode     TEXT NOT NULL DEFAULT 'sse_event', -- "sse_event" | "sse_comment" | "none"
    budget_daily    REAL,                      -- 日预算上限（USD），NULL 表示无限制
    budget_weekly   REAL,
    budget_monthly  REAL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 路由环节
CREATE TABLE route_stages (
    id              TEXT PRIMARY KEY,
    route_id        TEXT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    position        INTEGER NOT NULL,          -- 排序位置，从 0 开始
    strategy        TEXT NOT NULL,             -- "single" | "race"
    adoption        TEXT,                      -- race 采纳策略: "fastest_valid" | "priority"
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 环节候选
CREATE TABLE stage_candidates (
    id              TEXT PRIMARY KEY,
    stage_id        TEXT NOT NULL REFERENCES route_stages(id) ON DELETE CASCADE,
    endpoint_id     TEXT NOT NULL REFERENCES endpoints(id) ON DELETE CASCADE,
    priority        INTEGER NOT NULL DEFAULT 0,
    weight          INTEGER NOT NULL DEFAULT 1, -- race 时的权重
    retry_count     INTEGER NOT NULL DEFAULT 2,
    failure_rules   TEXT NOT NULL DEFAULT '{}', -- JSON: {"transport":"retry","http_429":"next_stage","http_5xx":"next_stage",...}
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 请求日志
CREATE TABLE request_logs (
    id              TEXT PRIMARY KEY,
    route_id        TEXT REFERENCES routes(id),
    final_endpoint_id TEXT REFERENCES endpoints(id),
    request_model   TEXT NOT NULL,             -- 消费者请求的模型名（可能是 Route 名）
    client_app      TEXT,                      -- 从 User-Agent 或 metadata 提取
    input_tokens    INTEGER NOT NULL DEFAULT 0,
    output_tokens   INTEGER NOT NULL DEFAULT 0,
    cache_read_tokens INTEGER NOT NULL DEFAULT 0,
    cache_write_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd        REAL NOT NULL DEFAULT 0,
    race_wasted_cost_usd REAL NOT NULL DEFAULT 0,
    fallback_count  INTEGER NOT NULL DEFAULT 0,
    total_latency_ms INTEGER NOT NULL DEFAULT 0,
    http_status     INTEGER,
    error_class     TEXT,                      -- "none" | "transport" | "http_status" | "protocol" | "semantic" | "budget" | "rate_limit"
    error_message   TEXT,
    stream          INTEGER NOT NULL DEFAULT 0,
    idempotency_key TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 单次尝试记录
CREATE TABLE attempts (
    id              TEXT PRIMARY KEY,
    request_log_id  TEXT NOT NULL REFERENCES request_logs(id) ON DELETE CASCADE,
    stage_position  INTEGER NOT NULL,
    endpoint_id     TEXT REFERENCES endpoints(id),
    attempt_number  INTEGER NOT NULL DEFAULT 0,
    outcome         TEXT NOT NULL,             -- "success" | "failure" | "cancelled" | "abandoned"
    error_class     TEXT,
    error_message   TEXT,
    http_status     INTEGER,
    input_tokens    INTEGER NOT NULL DEFAULT 0,
    output_tokens   INTEGER NOT NULL DEFAULT 0,
    cost_usd        REAL NOT NULL DEFAULT 0,
    latency_ms      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 事件日志
CREATE TABLE events (
    id              TEXT PRIMARY KEY,
    kind            TEXT NOT NULL,             -- "fallback" | "budget_exceeded" | "rate_limited" | "health_alert" | "circuit_open" | "config_change"
    severity        TEXT NOT NULL DEFAULT 'info', -- "info" | "warning" | "error" | "critical"
    route_id        TEXT,
    endpoint_id     TEXT,
    message         TEXT NOT NULL,
    detail          TEXT,                      -- JSON 详细信息
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 聚合用量
CREATE TABLE usage_rollups (
    id              TEXT PRIMARY KEY,
    dimension       TEXT NOT NULL,             -- "endpoint" | "credential" | "route" | "global" | "model"
    dimension_id    TEXT NOT NULL,
    period          TEXT NOT NULL,             -- "minute" | "hour" | "day"
    bucket_start    TEXT NOT NULL,             -- ISO 时间戳
    input_tokens    INTEGER NOT NULL DEFAULT 0,
    output_tokens   INTEGER NOT NULL DEFAULT 0,
    cache_read_tokens INTEGER NOT NULL DEFAULT 0,
    cache_write_tokens INTEGER NOT NULL DEFAULT 0,
    request_count   INTEGER NOT NULL DEFAULT 0,
    error_count     INTEGER NOT NULL DEFAULT 0,
    cost_usd        REAL NOT NULL DEFAULT 0,
    p50_latency_ms  INTEGER,
    p95_latency_ms  INTEGER,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(dimension, dimension_id, period, bucket_start)
);

-- 健康基线
CREATE TABLE health_baselines (
    id              TEXT PRIMARY KEY,
    endpoint_id     TEXT NOT NULL REFERENCES endpoints(id) ON DELETE CASCADE,
    probe_level     TEXT NOT NULL,             -- "L0" | "L1" | "L2"
    metric_name     TEXT NOT NULL,             -- "ttft_ms" | "tpot_ms" | "capability_score" | "fingerprint_hash"
    median          REAL NOT NULL,
    mad             REAL NOT NULL,
    sample_count    INTEGER NOT NULL DEFAULT 0,
    last_updated    TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(endpoint_id, probe_level, metric_name)
);

-- 健康检查记录
CREATE TABLE health_checks (
    id              TEXT PRIMARY KEY,
    endpoint_id     TEXT NOT NULL REFERENCES endpoints(id) ON DELETE CASCADE,
    probe_level     TEXT NOT NULL,             -- "L0" | "L1" | "L2"
    status          TEXT NOT NULL,             -- "pass" | "warn" | "fail"
    metrics         TEXT NOT NULL DEFAULT '{}', -- JSON: {"ttft_ms": 123, "tpot_ms": 45, "capability_score": 0.92, "fingerprint_hash": "..."}
    drift_detected  INTEGER NOT NULL DEFAULT 0,
    drift_detail    TEXT,
    latency_ms      INTEGER,
    token_used      INTEGER NOT NULL DEFAULT 0,
    cost_usd        REAL NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 应用配置（key-value）
CREATE TABLE app_config (
    key             TEXT PRIMARY KEY,
    value           TEXT NOT NULL,
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 索引
CREATE INDEX idx_request_logs_created ON request_logs(created_at DESC);
CREATE INDEX idx_request_logs_route ON request_logs(route_id);
CREATE INDEX idx_attempts_request ON attempts(request_log_id);
CREATE INDEX idx_events_created ON events(created_at DESC);
CREATE INDEX idx_health_checks_endpoint ON health_checks(endpoint_id, created_at DESC);
CREATE INDEX idx_usage_rollups_dim ON usage_rollups(dimension, dimension_id, period, bucket_start);
```

### 4.2 Migration `0002_route_budget_config.sql`

```sql
-- 路由级预算熔断配置（补充 routes 表的详细配置）
CREATE TABLE route_budget_configs (
    id              TEXT PRIMARY KEY,
    route_id        TEXT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    budget_type     TEXT NOT NULL,             -- "daily" | "weekly" | "monthly"
    limit_usd       REAL NOT NULL,
    action          TEXT NOT NULL DEFAULT 'warn', -- "warn" | "reject" | "downgrade"
    downgrade_route TEXT,                      -- 降级目标路由
    enabled         INTEGER NOT NULL DEFAULT 0, -- 默认关闭，用户手动开启
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(route_id, budget_type)
);

-- 全局预算配置
CREATE TABLE global_budget_config (
    id              TEXT PRIMARY KEY,
    budget_type     TEXT NOT NULL,
    limit_usd       REAL NOT NULL,
    action          TEXT NOT NULL DEFAULT 'warn',
    enabled         INTEGER NOT NULL DEFAULT 0,
    UNIQUE(budget_type)
);

-- 限流配置
CREATE TABLE rate_limit_configs (
    id              TEXT PRIMARY KEY,
    scope           TEXT NOT NULL,             -- "global" | "route" | "credential" | "endpoint"
    scope_id        TEXT,                      -- 对应 scope 的 ID
    rpm             INTEGER,                   -- 每分钟请求数
    tpm             INTEGER,                   -- 每分钟 token 数
    concurrency     INTEGER,                   -- 并发数
    enabled         INTEGER NOT NULL DEFAULT 0,
    UNIQUE(scope, scope_id)
);

-- 消费者 API 鉴权
CREATE TABLE consumer_tokens (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    token_hash      TEXT NOT NULL,             -- SHA-256 hash
    enabled         INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    last_used_at    TEXT
);
```

### 4.3 Migration `0003_cache_and_session.sql`

```sql
-- 网关侧精确缓存条目
CREATE TABLE gateway_cache_entries (
    id              TEXT PRIMARY KEY,
    idempotency_key TEXT NOT NULL,
    request_hash    TEXT NOT NULL,             -- 规范化请求的 SHA-256
    response_body   TEXT NOT NULL,             -- 完整响应 JSON
    input_tokens    INTEGER NOT NULL DEFAULT 0,
    output_tokens   INTEGER NOT NULL DEFAULT 0,
    cost_usd        REAL NOT NULL DEFAULT 0,
    expires_at      TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(idempotency_key)
);

-- 粘滞会话映射
CREATE TABLE sticky_sessions (
    id              TEXT PRIMARY KEY,
    session_key     TEXT NOT NULL,             -- 由 client_app + 部分 system 哈希生成
    route_id        TEXT NOT NULL REFERENCES routes(id),
    endpoint_id     TEXT NOT NULL REFERENCES endpoints(id),
    last_used_at    TEXT NOT NULL DEFAULT (datetime('now')),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(session_key, route_id)
);
```

---
## 5. 核心类型定义


### 5.1 错误类型（`src-tauri/src/error.rs`）

```rust
use thiserror::Error;

/// 四层失败分类（D3 决策）
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum FailureClass {
    /// 网络层失败：连接超时、DNS 解析失败、TLS 握手失败、连接重置
    Transport,
    /// HTTP 状态码失败：4xx/5xx
    HttpStatus(u16),
    /// 协议层失败：响应无法解析、缺少必要字段、空 content
    Protocol,
    /// 语义层失败：内容截断、内容过滤、校验器拒绝
    Semantic,
}

impl FailureClass {
    pub fn as_str(&self) -> &'static str {
        match self {
            FailureClass::Transport => "transport",
            FailureClass::HttpStatus(_) => "http_status",
            FailureClass::Protocol => "protocol",
            FailureClass::Semantic => "semantic",
        }
    }
}

/// 统一错误类型
#[derive(Debug, Error)]
pub enum LlmgwError {
    // 上游错误
    #[error("transport error: {0}")]
    Transport(#[from] reqwest::Error),

    #[error("http error: status={status}, body={body}")]
    HttpError { status: u16, body: String },

    #[error("protocol error: {0}")]
    Protocol(String),

    #[error("semantic error: {0}")]
    Semantic(String),

    // 网关自身错误
    #[error("budget exceeded: {0}")]
    BudgetExceeded(String),

    #[error("rate limited: {0}")]
    RateLimited(String),

    #[error("circuit breaker open for endpoint {endpoint_id}")]
    CircuitBreakerOpen { endpoint_id: String },

    #[error("validation error: {0}")]
    Validation(String),

    #[error("not found: {0}")]
    NotFound(String),

    #[error("already exists: {0}")]
    AlreadyExists(String),

    #[error("authentication failed")]
    Unauthorized,

    #[error("internal error: {0}")]
    Internal(String),

    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}

impl LlmgwError {
    /// 将错误映射到失败分类
    pub fn classify(&self) -> FailureClass {
        match self {
            LlmgwError::Transport(_) => FailureClass::Transport,
            LlmgwError::HttpError { status, .. } => FailureClass::HttpStatus(*status),
            LlmgwError::Protocol(_) => FailureClass::Protocol,
            LlmgwError::Semantic(_) => FailureClass::Semantic,
            _ => FailureClass::Protocol, // 默认归类
        }
    }
}

pub type Result<T> = std::result::Result<T, LlmgwError>;
```

### 5.2 Canonical IR（`src-tauri/src/protocol/mod.rs`）

```rust
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// 系统提示块
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SystemBlock {
    pub text: String,
    /// cache_control 断点标记（对应 Anthropic 的 ephemeral）
    pub cache_control: Option<CacheControl>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CacheControl {
    pub kind: CacheControlKind,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum CacheControlKind {
    Ephemeral,
    Persistent,
}

/// 消息内容块
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ContentBlock {
    /// 纯文本
    Text { text: String },
    /// 思考块（Anthropic extended thinking，带签名）
    Thinking {
        text: String,
        signature: Option<String>,
    },
    /// 工具调用
    ToolUse {
        id: String,
        name: String,
        input: Value,
    },
    /// 工具结果（仅用于 tool_result 消息）
    ToolResult {
        tool_use_id: String,
        content: String,
        is_error: bool,
    },
    /// 图片（vision）
    Image {
        media_type: String,
        data_base64: String,
    },
}

/// 消息角色
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum MessageRole {
    User,
    Assistant,
    ToolResult,
}

/// 规范化消息
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CanonicalMessage {
    pub role: MessageRole,
    pub content: Vec<ContentBlock>,
    /// 用于 tool_result 消息：关联的 tool_use_id
    pub tool_use_id: Option<String>,
    /// 消息 ID（如果上游支持）
    pub message_id: Option<String>,
}

/// 工具定义
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CanonicalTool {
    pub name: String,
    pub description: Option<String>,
    pub parameters: Value, // JSON Schema
}

/// 工具选择策略
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ToolChoice {
    Auto,
    None,
    Required,
    Specific { name: String },
}

/// 请求元数据
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub struct RequestMetadata {
    pub route_hint: Option<String>,
    pub client_app: Option<String>,
    pub idempotency_key: Option<String>,
    pub session_key: Option<String>,
    pub max_race_input_tokens: Option<u32>, // 覆盖默认阈值
}

/// 规范化请求（Canonical IR 核心结构）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanonicalRequest {
    pub system: Vec<SystemBlock>,
    pub messages: Vec<CanonicalMessage>,
    pub tools: Vec<CanonicalTool>,
    pub tool_choice: Option<ToolChoice>,
    pub max_tokens: u32,
    pub temperature: Option<f32>,
    pub top_p: Option<f32>,
    pub stop_sequences: Vec<String>,
    pub stream: bool,
    pub metadata: RequestMetadata,
}

/// 规范化响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanonicalResponse {
    pub message: CanonicalMessage,
    pub stop_reason: Option<StopReason>,
    pub usage: UsageInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StopReason {
    EndTurn,
    MaxTokens,
    StopSequence,
    ToolUse,
    ContentFiltered,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UsageInfo {
    pub input_tokens: u32,
    pub output_tokens: u32,
    pub cache_read_tokens: u32,
    pub cache_write_tokens: u32,
    pub total_tokens: u32,
    /// 是否来自上游的真实数据（false 表示本地估算）
    pub verified: bool,
}

/// 流式响应块（SSE 传输用）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum CanonicalStreamChunk {
    ContentDelta {
        text: String,
    },
    ThinkingDelta {
        text: String,
        signature: Option<String>,
    },
    ToolUseStart {
        id: String,
        name: String,
    },
    ToolUseDelta {
        id: String,
        input_delta: Value,
    },
    ToolUseEnd {
        id: String,
    },
    Usage {
        usage: UsageInfo,
    },
    Stop {
        stop_reason: StopReason,
    },
}
```

### 5.3 路由引擎类型（`src-tauri/src/routing/mod.rs`）

```rust
use crate::protocol::*;
use crate::error::*;

/// 阶段策略
#[derive(Debug, Clone)]
pub enum StageStrategy {
    Single {
        candidate: StageCandidateConfig,
        retries: u8,
    },
    Race {
        candidates: Vec<StageCandidateConfig>,
        adoption: AdoptionStrategy,
        race_input_token_limit: u32, // 默认 4000
    },
}

#[derive(Debug, Clone)]
pub struct StageCandidateConfig {
    pub endpoint_id: String,
    pub priority: u8,
    pub weight: u8,
    pub failure_rules: FailureRules,
}

/// 采纳策略（race）
#[derive(Debug, Clone)]
pub enum AdoptionStrategy {
    /// 最快通过校验的输出
    FastestValid,
    /// 按优先级排序，高优先级先到达则采纳
    Priority,
}

/// 失败规则映射
#[derive(Debug, Clone, Default)]
pub struct FailureRules {
    /// key: FailureClass 的字符串表示（如 "http_429", "transport", "semantic"）
    /// value: 动作
    pub rules: std::collections::HashMap<String, FailureAction>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FailureAction {
    /// 在同一候选上重试
    Retry,
    /// 进入下一个 Stage
    NextStage,
    /// 整体失败
    Fail,
    /// 降级（使用降级路由重新执行）
    Downgrade,
}

/// 路由执行结果
#[derive(Debug)]
pub struct RouteExecutionResult {
    pub final_endpoint_id: Option<String>,
    pub response: Option<CanonicalResponse>,
    pub stream: Option<Box<dyn Stream<Item = Result<CanonicalStreamChunk>> + Send + Unpin>>,
    pub fallback_count: u32,
    pub total_cost_usd: f64,
    pub race_wasted_cost_usd: f64,
    pub total_latency_ms: u64,
    pub used_endpoints: Vec<String>,
    pub notices: Vec<GatewayNotice>,
}

/// 网关通知（SSE 推送）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GatewayNotice {
    pub notice_type: NoticeType,
    pub from: Option<String>,
    pub to: Option<String>,
    pub reason: String,
    pub attempt: u32,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NoticeType {
    Fallback,
    BudgetWarning,
    BudgetExceeded,
    RateLimited,
    CircuitBreakerOpened,
    HealthAlert,
    RaceAbandoned,
}
```

### 5.4 Provider 适配器 Trait（`src-tauri/src/egress/adapters/mod.rs`）

```rust
use async_trait::async_trait;
use futures::Stream;
use crate::protocol::*;
use crate::error::*;

/// 上游服务商适配器
#[async_trait]
pub trait ProviderAdapter: Send + Sync {
    /// 协议类型
    fn protocol(&self) -> Protocol;

    /// 测试连接（发送最小请求验证连通性）
    async fn test_connectivity(
        &self,
        base_url: &str,
        api_key: &str,
        proxy: Option<&ProxyConfig>,
        timeout: std::time::Duration,
    ) -> Result<ConnectivityReport>;

    /// 发送非流式请求
    async fn chat_completion(
        &self,
        request: &CanonicalRequest,
        config: &UpstreamConfig,
    ) -> Result<CanonicalResponse>;

    /// 发送流式请求，返回 SSE 块流
    async fn stream_chat_completion(
        &self,
        request: &CanonicalRequest,
        config: &UpstreamConfig,
    ) -> Result<Box<dyn Stream<Item = Result<CanonicalStreamChunk>> + Send + Unpin>>;

    /// 列出模型（从上游 API 获取可用模型列表，失败则返回缓存）
    async fn list_models(
        &self,
        config: &UpstreamConfig,
    ) -> Result<Vec<ModelInfo>>;
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Protocol {
    OpenAI,
    Anthropic,
    Gemini,
    OpenAICompat, // 中转站通用
}

#[derive(Debug, Clone)]
pub struct UpstreamConfig {
    pub base_url: String,
    pub api_key: String,
    pub model_name: String,
    pub proxy: Option<ProxyConfig>,
    pub timeout: std::time::Duration,
    pub extra_headers: std::collections::HashMap<String, String>,
}

#[derive(Debug, Clone)]
pub struct ProxyConfig {
    pub url: String,       // socks5://host:port 或 http://host:port
    pub username: Option<String>,
    pub password: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ConnectivityReport {
    pub tcp_latency_ms: u64,
    pub tls_latency_ms: u64,
    pub http_latency_ms: u64,
    pub total_latency_ms: u64,
    pub status_code: u16,
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Clone)]
pub struct ModelInfo {
    pub id: String,
    pub display_name: Option<String>,
    pub context_window: Option<u32>,
    pub max_output_tokens: Option<u32>,
    pub supports_tools: bool,
    pub supports_vision: bool,
    pub supports_cache_control: bool,
}
```

---
## 6. 模块接口规范


### 6.1 全局状态（`state.rs`）

```rust
use std::sync::Arc;
use parking_lot::RwLock;
use sqlx::SqlitePool;

/// 应用共享状态
pub struct AppState {
    pub db: SqlitePool,
    pub config: Arc<AppConfig>,
    pub route_engine: Arc<RouteEngine>,
    pub budget_manager: Arc<BudgetManager>,
    pub rate_limiter: Arc<RateLimiter>,
    pub health_manager: Arc<HealthManager>,
    pub cache_manager: Arc<CacheManager>,
    pub metrics: Arc<MetricsCollector>,
    pub event_bus: Arc<EventBus>,
    pub admin_token: String,
}

impl AppState {
    pub async fn initialize(data_dir: &Path) -> Result<Self> {
        // 1. 初始化数据库连接池
        // 2. 执行 migrations
        // 3. 加载配置
        // 4. 构建各子系统
        // 5. 启动健康检测调度器
        // 6. 启动 rollup 定时任务
    }

    pub async fn shutdown(&self) {
        // 优雅关闭
    }
}

/// 应用配置
pub struct AppConfig {
    pub data_dir: PathBuf,
    pub log_dir: PathBuf,
    pub consumer_port: u16,        // 默认 8787
    pub admin_port: u16,           // 默认 8788
    pub consumer_auth_enabled: bool,
    pub gateway_cache_enabled: bool,   // 默认 false
    pub gateway_cache_ttl_seconds: u64,
    pub race_input_token_limit: u32,   // 默认 4000
    pub race_enabled_default: bool,    // 默认 false
    pub budget_enabled: bool,          // 默认 false
    pub budget_action: BudgetAction,   // Warn | Reject
    pub health_l0_interval_minutes: u64,  // 默认 60
    pub health_l1_interval_hours: u64,    // 默认 6
    pub mad_threshold: f64,              // 默认 3.0
    pub log_retention_days: u32,         // 默认 30
    pub daily_restart_enabled: bool,
    pub minimize_to_tray: bool,
}
```

### 6.2 路由引擎（`routing/mod.rs`）

```rust
/// 路由引擎：执行 chain/race 路由策略
pub struct RouteEngine {
    route_cache: Arc<ArcSwap<HashMap<String, RouteConfig>>>,
    endpoint_registry: Arc<EndpointRegistry>,
    circuit_breaker: Arc<CircuitBreaker>,
    cooldown: Arc<CooldownManager>,
    budget: Arc<BudgetManager>,
    rate_limiter: Arc<RateLimiter>,
    adapter_factory: Arc<AdapterFactory>,
    metrics: Arc<MetricsCollector>,
    event_bus: Arc<EventBus>,
}

impl RouteEngine {
    /// 执行路由请求（非流式）
    pub async fn execute(
        &self,
        request: CanonicalRequest,
        route_name: &str,
    ) -> Result<RouteExecutionResult>;

    /// 执行路由请求（流式），返回流
    pub async fn execute_stream(
        &self,
        request: CanonicalRequest,
        route_name: &str,
    ) -> Result<RouteExecutionResult>;

    /// 重新加载路由配置（配置变更时调用）
    pub fn reload(&self);
}

/// 路由配置（从数据库加载）
pub struct RouteConfig {
    pub id: String,
    pub name: String,
    pub stages: Vec<StageConfig>,
    pub sticky_session: bool,
    pub notify_mode: NotifyMode,
    pub budget_limits: Vec<BudgetLimit>,
}

pub struct StageConfig {
    pub strategy: StageStrategy,
}
```

#### 路由执行算法（伪代码 → Rust 逻辑）

```rust
async fn execute_route(
    request: &CanonicalRequest,
    route: &RouteConfig,
    state: &AppState,
) -> Result<RouteExecutionResult> {
    // 1. 预算检查
    if state.budget.enabled() {
        state.budget.check_or_fail(route, &request)?; // BudgetExceeded → Err
    }

    // 2. 限流检查
    state.rate_limiter.check_or_fail(route, &request)?; // RateLimited → Err

    // 3. 粘滞会话检查
    if route.sticky_session {
        if let Some(session_key) = &request.metadata.session_key {
            if let Some(sticky_endpoint) = get_sticky_endpoint(session_key, &route.id)? {
                return try_single_endpoint(request, &sticky_endpoint, state).await;
            }
        }
    }

    // 4. 阶段链执行
    let mut fallback_count = 0u32;
    let mut total_cost = 0f64;
    let mut waste_cost = 0f64;
    let mut notices: Vec<GatewayNotice> = Vec::new();
    let mut used_endpoints: Vec<String> = Vec::new();

    for (stage_idx, stage) in route.stages.iter().enumerate() {
        match &stage.strategy {
            StageStrategy::Single { candidate, retries } => {
                let endpoint = state.endpoint_registry.get(&candidate.endpoint_id)?;
                used_endpoints.push(endpoint.id.clone());

                // 熔断检查
                if state.circuit_breaker.is_open(&endpoint.id) {
                    notices.push(GatewayNotice {
                        notice_type: NoticeType::CircuitBreakerOpened,
                        from: Some(endpoint.id.clone()),
                        to: None,
                        reason: "circuit_breaker_open".into(),
                        attempt: 0,
                        timestamp: now(),
                    });
                    continue; // 跳过此 stage
                }

                // 冷却检查
                if state.cooldown.is_cooling_down(&endpoint.id) {
                    notices.push(GatewayNotice {
                        notice_type: NoticeType::Fallback,
                        from: Some(endpoint.id.clone()),
                        to: None,
                        reason: "cooldown".into(),
                        attempt: 0,
                        timestamp: now(),
                    });
                    continue;
                }

                let mut last_error: Option<LlmgwError> = None;
                for attempt in 0..=*retries {
                    match try_endpoint(request, &endpoint, state).await {
                        Ok(response) => {
                            // 成功
                            state.circuit_breaker.record_success(&endpoint.id);
                            state.cooldown.clear(&endpoint.id);
                            // 记录粘滞会话
                            if route.sticky_session {
                                if let Some(sk) = &request.metadata.session_key {
                                    save_sticky_session(sk, &route.id, &endpoint.id)?;
                                }
                            }
                            return Ok(RouteExecutionResult {
                                final_endpoint_id: Some(endpoint.id.clone()),
                                response: Some(response.0),
                                stream: response.1,
                                fallback_count,
                                total_cost_usd: total_cost + response.2,
                                race_wasted_cost_usd: waste_cost,
                                total_latency_ms: response.3,
                                used_endpoints,
                                notices,
                            });
                        }
                        Err(e) => {
                            last_error = Some(e.clone());
                            let class = e.classify();
                            let action = candidate
                                .failure_rules
                                .rules
                                .get(class.as_str())
                                .unwrap_or(&FailureAction::NextStage);

                            state.circuit_breaker.record_failure(&endpoint.id);

                            match action {
                                FailureAction::Retry if attempt < *retries => continue,
                                FailureAction::NextStage => {
                                    fallback_count += 1;
                                    state.cooldown.record_failure(&endpoint.id);
                                    notices.push(GatewayNotice {
                                        notice_type: NoticeType::Fallback,
                                        from: Some(endpoint.id.clone()),
                                        to: None, // 下一个 stage 的 endpoint 未知
                                        reason: format!("{}_{}", class.as_str(), e.to_string()),
                                        attempt: attempt + 1,
                                        timestamp: now(),
                                    });
                                    break; // 跳出重试循环，进入下一个 stage
                                }
                                FailureAction::Fail => return Err(e),
                                FailureAction::Downgrade => {
                                    // 使用降级路由
                                    // 实现：查找 route.budget_limits 中配置的 downgrade_route
                                    // 递归调用 execute_route
                                    todo!("downgrade route execution")
                                }
                            }
                        }
                    }
                }
                if let Some(e) = last_error {
                    // 所有重试耗尽
                    return Err(e);
                }
            }

            StageStrategy::Race { candidates, adoption, race_input_token_limit } => {
                // race 条件检查
                let input_tokens = estimate_input_tokens(request);
                let race_allowed = state.config.race_enabled_default
                    && input_tokens <= *race_input_token_limit;

                if !race_allowed {
                    // 降级为 sequential：按优先级尝试
                    let sorted: Vec<_> = candidates.iter()
                        .sorted_by_key(|c| c.priority).collect();
                    for c in sorted {
                        // 作为 single 处理
                        // ... 类似 single 逻辑
                    }
                    continue;
                }

                // 并发执行所有候选
                let mut handles = Vec::new();
                for candidate in candidates {
                    let endpoint = state.endpoint_registry.get(&candidate.endpoint_id)?;
                    if state.circuit_breaker.is_open(&endpoint.id) {
                        continue;
                    }
                    let fut = try_endpoint_with_cancel(request, &endpoint, state);
                    handles.push((candidate.priority, endpoint.id.clone(), fut));
                }

                // 按采纳策略等待
                match adoption {
                    AdoptionStrategy::FastestValid => {
                        // 使用 tokio::select! 或 FuturesUnordered
                        let mut futures = FuturesUnordered::new();
                        for (priority, id, fut) in handles {
                            futures.push(async move {
                                let result = fut.await;
                                (priority, id, result)
                            });
                        }

                        let mut winner: Option<(String, CanonicalResponse, f64)> = None;
                        while let Some((_, id, result)) = futures.next().await {
                            match result {
                                Ok((resp, cost)) => {
                                    winner = Some((id, resp, cost));
                                    break; // 第一个成功的
                                }
                                Err(_) => continue, // 跳过失败的
                            }
                        }

                        // 取消剩余任务
                        drop(futures); // 自动取消

                        match winner {
                            Some((id, resp, cost)) => {
                                // 记录被丢弃分支的成本
                                // waste_cost += 其他分支已产生的 cost
                                return Ok(RouteExecutionResult { /* ... */ });
                            }
                            None => {
                                // 所有候选都失败
                                continue; // 进入下一个 stage
                            }
                        }
                    }
                    AdoptionStrategy::Priority => {
                        // 按优先级排序，等待高优先级的先完成
                        // 实现略
                    }
                }
            }
        }
    }

    // 所有 stage 都失败
    Err(LlmgwError::Semantic("all stages exhausted".into()))
}
```

### 6.3 出口层（`egress/mod.rs`）

```rust
/// 出口层：封装上游 HTTP 调用
pub struct EgressClient {
    http_client: reqwest::Client,
}

impl EgressClient {
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            .pool_max_idle_per_host(10)
            .timeout(std::time::Duration::from_secs(300)) // SSE 长连接
            .connect_timeout(std::time::Duration::from_secs(30))
            .build()
            .unwrap();
        Self { http_client: client }
    }

    /// 发送非流式请求到上游
    pub async fn send(
        &self,
        adapter: &dyn ProviderAdapter,
        request: &CanonicalRequest,
        config: &UpstreamConfig,
    ) -> Result<CanonicalResponse> {
        adapter.chat_completion(request, config).await
    }

    /// 发送流式请求，返回字节流
    pub async fn send_stream(
        &self,
        adapter: &dyn ProviderAdapter,
        request: &CanonicalRequest,
        config: &UpstreamConfig,
    ) -> Result<Box<dyn Stream<Item = Result<CanonicalStreamChunk>> + Send + Unpin>> {
        adapter.stream_chat_completion(request, config).await
    }
}
```

### 6.4 计费引擎（`billing/mod.rs`）

```rust
/// 计费引擎
pub struct BillingEngine {
    pricing_cache: Arc<RwLock<HashMap<(String, String), PricingEntry>>>,
}

impl BillingEngine {
    /// 计算请求费用
    pub fn calculate_cost(
        &self,
        provider_id: &str,
        model_name: &str,
        usage: &UsageInfo,
    ) -> Result<CostBreakdown>;

    /// 获取 Coding Plan 额度（双轨：API 同步 / 手动 / 估算）
    pub async fn get_quota(&self, credential_id: &str) -> Result<QuotaReport>;

    /// 更新已用额度
    pub async fn record_usage(
        &self,
        credential_id: &str,
        tokens: u64,
        cost_usd: f64,
    ) -> Result<()>;
}

#[derive(Debug, Clone)]
pub struct CostBreakdown {
    pub input_cost: f64,
    pub output_cost: f64,
    pub cache_read_cost: f64,
    pub cache_write_cost: f64,
    pub total_cost: f64,
}

#[derive(Debug, Clone)]
pub struct QuotaReport {
    pub source: QuotaSource,      // Api | Manual | Estimated
    pub total: f64,
    pub used: f64,
    pub remaining: f64,
    pub confidence: f64,
    pub last_sync_at: Option<DateTime<Utc>>,
}
```

### 6.5 预算管理器（`billing/budget.rs`）

```rust
/// 三级预算熔断
pub struct BudgetManager {
    config: Arc<RwLock<BudgetConfigs>>,
    usage_tracker: Arc<UsageTracker>,
}

#[derive(Debug, Clone, Default)]
pub struct BudgetConfigs {
    pub enabled: bool,               // 全局开关，默认 false
    pub global: Vec<BudgetRule>,
    pub route_rules: HashMap<String, Vec<BudgetRule>>,     // route_id → rules
    pub connection_rules: HashMap<String, Vec<BudgetRule>>, // credential_id → rules
}

#[derive(Debug, Clone)]
pub struct BudgetRule {
    pub period: BudgetPeriod,       // Daily | Weekly | Monthly
    pub limit_usd: f64,
    pub action: BudgetAction,       // Warn | Reject | Downgrade
    pub downgrade_route: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BudgetPeriod { Daily, Weekly, Monthly }

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BudgetAction { Warn, Reject, Downgrade }

impl BudgetManager {
    /// 在请求前检查预算
    /// 返回 Result：Ok(()) 通过，Err(BudgetExceeded) 超限
    pub async fn check_before_request(
        &self,
        route: &RouteConfig,
        credential_id: Option<&str>,
    ) -> Result<Vec<BudgetWarning>>;

    /// 在请求后记录消耗
    pub async fn record_spend(
        &self,
        route_id: &str,
        credential_id: &str,
        cost_usd: f64,
    ) -> Result<()>;

    /// 异常速率检测：滚动窗口内的花费速率
    pub async fn check_spend_anomaly(&self) -> Result<Vec<AnomalyAlert>>;
}
```

### 6.6 限流器（`billing/rate_limit.rs`）

```rust
/// 滑动窗口限流器（令牌桶 + 滑动窗口）
pub struct RateLimiter {
    buckets: Arc<RwLock<HashMap<String, TokenBucket>>>,
}

#[derive(Debug, Clone)]
pub struct TokenBucket {
    pub rpm_limit: Option<u32>,       // 每分钟请求数
    pub tpm_limit: Option<u64>,       // 每分钟 token 数
    pub concurrency_limit: Option<u32>,
    pub current_rpm: Arc<AtomicU32>,
    pub current_tpm: Arc<AtomicU64>,
    pub current_concurrency: Arc<AtomicU32>,
    pub window_start: Arc<AtomicU64>, // epoch seconds
}

impl RateLimiter {
    pub fn check(
        &self,
        scope: &RateLimitScope,
        estimated_tokens: u64,
    ) -> Result<()>;

    pub fn release(&self, scope: &RateLimitScope);
}
```

### 6.7 缓存子系统（`cache/mod.rs`）

```rust
/// 缓存管理器
pub struct CacheManager {
    gateway_cache_enabled: bool,      // 默认 false
    gateway_cache: Arc<RwLock<HashMap<String, CachedResponse>>>,
    prefix_analyzer: PrefixAnalyzer,
}

impl CacheManager {
    /// 检查幂等缓存
    pub async fn check_idempotent_cache(
        &self,
        idempotency_key: &str,
        request_hash: &str,
    ) -> Option<CanonicalResponse>;

    /// 存储幂等缓存
    pub async fn store_idempotent_cache(
        &self,
        idempotency_key: &str,
        request_hash: &str,
        response: &CanonicalResponse,
        ttl: Duration,
    );

    /// 分析公共前缀（用于 cache_control 注入）
    pub fn analyze_common_prefix(&self, request: &CanonicalRequest) -> PrefixAnalysis;

    /// 注入 cache_control 断点
    pub fn inject_cache_control(
        &self,
        request: &mut CanonicalRequest,
        protocol: Protocol,
    );

    /// 清理过期缓存
    pub async fn cleanup_expired(&self);
}

#[derive(Debug, Clone)]
pub struct PrefixAnalysis {
    /// 公共前缀的 system block 索引（包含的最后一个 block 的 index）
    pub system_prefix_end: usize,
    /// 公共前缀的 message 索引（包含的最后一个 message 的 index）
    pub message_prefix_end: usize,
    /// 公共前缀的总 token 估算
    pub estimated_prefix_tokens: u64,
    /// 是否有足够的公共前缀值得注入
    pub worth_injecting: bool,
}
```

#### cache_control 注入算法

```rust
impl PrefixAnalyzer {
    pub fn analyze(&self, request: &CanonicalRequest) -> PrefixAnalysis {
        let mut system_end = 0usize;
        let mut message_end = 0usize;
        let mut total_tokens = 0u64;

        // system blocks 全部是公共前缀
        for (i, block) in request.system.iter().enumerate() {
            total_tokens += estimate_tokens(&block.text);
            system_end = i;
            // 如果有 cache_control 标记，从这里开始新的缓存段
            if block.cache_control.is_some() {
                total_tokens = estimate_tokens(&block.text);
            }
        }

        // messages：找到公共前缀
        // 常见模式：前几条 user 消息包含上下文/工具定义
        // 策略：找到第一条包含 ToolUse 的 assistant 消息之前的 user 消息
        for (i, msg) in request.messages.iter().enumerate() {
            if msg.role == MessageRole::Assistant {
                // 检查是否包含工具调用——工具调用后的消息不属于公共前缀
                if msg.content.iter().any(|c| matches!(c, ContentBlock::ToolUse { .. })) {
                    break;
                }
                // 简单的 assistant 回复可以包含在公共前缀中
                // 但为了安全，默认不包含 assistant 回复
                break;
            }
            if msg.role == MessageRole::ToolResult {
                break; // tool_result 不包含在公共前缀
            }
            // user 消息可以包含
            for block in &msg.content {
                if let ContentBlock::Text { text } = block {
                    total_tokens += estimate_tokens(text);
                }
                // 图片不包含在公共前缀分析中
            }
            message_end = i;
        }

        PrefixAnalysis {
            system_prefix_end: system_end,
            message_prefix_end: message_end,
            estimated_prefix_tokens: total_tokens,
            worth_injecting: total_tokens >= 1024, // 至少 1k token 才值得
        }
    }
}
```

### 6.8 健康检测（`health/mod.rs`）

```rust
/// 健康检测管理器
pub struct HealthManager {
    scheduler: HealthScheduler,
    baseline_engine: BaselineEngine,
    fingerprint: FingerprintEngine,
    probe_definitions: ProbeLibrary,
    event_bus: Arc<EventBus>,
}

impl HealthManager {
    /// 启动调度器
    pub fn start(&self);

    /// 停止调度器
    pub fn stop(&self);

    /// 手动触发一次 L0 检查
    pub async fn trigger_l0(&self, endpoint_id: &str) -> Result<HealthCheckResult>;

    /// 手动触发一次 L1 检查
    pub async fn trigger_l1(&self, endpoint_id: &str) -> Result<HealthCheckResult>;

    /// 手动触发 L2 深度鉴定
    pub async fn trigger_l2(&self, endpoint_id: &str) -> Result<HealthCheckResult>;

    /// 获取当前健康状态
    pub async fn get_status(&self, endpoint_id: &str) -> Result<EndpointHealthStatus>;
}

/// 基线漂移引擎（MAD 判定）
pub struct BaselineEngine {
    baselines: Arc<RwLock<HashMap<String, Vec<BaselineSample>>>>,
}

impl BaselineEngine {
    /// 添加新样本并检测漂移
    pub fn add_sample_and_detect(
        &self,
        endpoint_id: &str,
        probe_level: &str,
        metric_name: &str,
        value: f64,
        mad_threshold: f64,
    ) -> DriftResult;

    /// 计算当前基线的中位数和 MAD
    fn calculate_baseline(samples: &[BaselineSample]) -> (f64, f64);

    /// 检测值是否偏离基线超过 N 个 MAD
    fn detect_drift(value: f64, median: f64, mad: f64, threshold: f64) -> bool {
        if mad == 0.0 {
            return (value - median).abs() > 1.0;
        }
        (value - median).abs() / mad > threshold
    }
}

/// 响应指纹引擎
pub struct FingerprintEngine;

impl FingerprintEngine {
    /// 入网时记录响应指纹
    pub fn fingerprint_response(response: &CanonicalResponse) -> FingerprintHash;

    /// 比较指纹是否匹配
    pub fn compare_fingerprints(
        stored: &FingerprintHash,
        current: &FingerprintHash,
    ) -> FingerprintMatch;
}

#[derive(Debug, Clone)]
pub struct FingerprintHash {
    /// 响应长度分布特征
    pub length_histogram: Vec<u32>,
    /// 停用词频率特征
    pub stopword_freq: Vec<f64>,
    /// 特殊标记特征（如 refusal 模式）
    pub marker_patterns: Vec<String>,
    /// 哈希值
    pub hash: String,
}
```

#### L0 心跳探针定义

```json
{
  "probe_level": "L0",
  "token_budget": 50,
  "request": {
    "system": [],
    "messages": [
      {
        "role": "user",
        "content": [{ "type": "text", "text": "ping" }]
      }
    ],
    "max_tokens": 10,
    "temperature": 0,
    "stream": false
  },
  "metrics": ["ttft_ms", "tpot_ms", "fingerprint_hash", "http_status"]
}
```

#### L1 能力探针定义

```json
{
  "probe_level": "L1",
  "token_budget": 2000,
  "tests": [
    {
      "name": "instruction_following",
      "prompt": "列出三个质数，用 JSON 数组格式返回，不要其他内容。",
      "expected_pattern": "^\\[\\s*\\d+\\s*,\\s*\\d+\\s*,\\s*\\d+\\s*\\]$",
      "score_weight": 0.3
    },
    {
      "name": "code_completion",
      "prompt": "补全以下 Rust 函数：\nfn fibonacci(n: u32) -> u32 {\n    // TODO\n}",
      "expected_pattern": "(match|if|loop|recursive)",
      "score_weight": 0.35
    },
    {
      "name": "simple_logic",
      "prompt": "如果所有 A 都是 B，有些 B 是 C，那么是否所有 A 都是 C？回答是或否并解释。",
      "expected_pattern": "否|不一定|不是",
      "score_weight": 0.35
    }
  ],
  "metrics": ["capability_score", "ttft_ms", "tpot_ms", "fingerprint_hash"]
}
```

---
## 7. API 规范


### 7.1 消费者 API（8787，OpenAI 兼容）


#### `POST /v1/chat/completions`

**请求体**（兼容 OpenAI 格式，扩展字段以 `x_gateway_` 前缀标记）：

```json
{
  "model": "my-coding-route",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello" }
  ],
  "max_tokens": 1024,
  "temperature": 0.7,
  "stream": false,
  "tools": [
    {
      "type": "function",
      "function": { "name": "get_weather", "description": "...", "parameters": {} }
    }
  ],
  "x_gateway_route": "my-coding-route",
  "x_gateway_idempotency_key": "optional-uuid",
  "x_gateway_session_key": "optional-session-id"
}
```

**非流式响应**：

```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1725340000,
  "model": "my-coding-route",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 7,
    "total_tokens": 17
  },
  "x_gateway_metadata": {
    "actual_model": "claude-sonnet-4-20250514",
    "endpoint_id": "endpoint_xxx",
    "fallback_count": 0,
    "cost_usd": 0.000123,
    "cache_read_tokens": 0,
    "cache_write_tokens": 0
  }
}
```

**流式响应（SSE）**：

```
data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1725340000,"model":"my-coding-route","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1725340000,"model":"my-coding-route","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1725340000,"model":"my-coding-route","choices":[{"index":0,"delta":{"content":"!"},"finish_reason":null}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1725340000,"model":"my-coding-route","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

**fallback 通知（自定义 SSE 事件）**：

```
event: gateway.notice
data: {"notice_type":"fallback","from":"endpoint_openai_gpt4","to":null,"reason":"http_429","attempt":1,"timestamp":"2026-09-03T10:30:00Z"}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk",...}
```

#### `GET /v1/models`

返回上游模型和 Route 虚拟模型的混合列表：

```json
{
  "object": "list",
  "data": [
    {
      "id": "my-coding-route",
      "object": "model",
      "created": 1725340000,
      "owned_by": "llmgw",
      "is_route": true
    },
    {
      "id": "gpt-4o",
      "object": "model",
      "created": 1725340000,
      "owned_by": "openai",
      "is_route": false
    }
  ]
}
```

#### `POST /v1/messages`（Anthropic 原生格式直通）

**请求体**（Anthropic Messages API 格式）：

```json
{
  "model": "my-coding-route",
  "max_tokens": 1024,
  "system": "You are a helpful assistant.",
  "messages": [
    { "role": "user", "content": "Hello" }
  ]
}
```

**响应**：Anthropic 格式（非流式或 SSE 流式）


#### `GET /v1/events`（SSE 事件流）

```typescript
// 响应为 SSE 流，事件类型：
type GatewayEvent =
  | { type: "fallback"; from: string; to: string | null; reason: string; attempt: number; timestamp: string }
  | { type: "budget_warning"; scope: string; limit_usd: number; current_usd: number }
  | { type: "budget_exceeded"; scope: string; limit_usd: number; current_usd: number }
  | { type: "rate_limited"; scope: string; limit: string }
  | { type: "circuit_breaker_opened"; endpoint_id: string }
  | { type: "health_alert"; endpoint_id: string; level: string; detail: string }
  | { type: "race_abandoned"; endpoint_id: string; wasted_cost_usd: number };
```

#### `GET /healthz`

```json
{ "status": "ok", "version": "0.1.0" }
```

### 7.2 管理 API（8788，内部）

所有请求需要 `Authorization: Bearer <admin_token>` 头。admin_token 在应用启动时生成，存储在本地文件中。


#### 连接管理

```
GET    /api/connections                    # 列出所有连接（含凭证、endpoint 概览）
POST   /api/connections                    # 创建连接
GET    /api/connections/:id                # 获取连接详情
PUT    /api/connections/:id                # 更新连接
DELETE /api/connections/:id                # 删除连接

GET    /api/providers                      # 列出所有 Provider 模板
POST   /api/providers                      # 创建自定义 Provider
PUT    /api/providers/:id                  # 更新 Provider

POST   /api/connections/test               # 测试连接（分层网络测试）
# body: { credential_id, proxy_policy_id?, timeout_ms? }

GET    /api/connections/:id/quotas         # 获取 Coding Plan 额度
POST   /api/connections/:id/quotas/sync    # 手动同步额度（API 来源）
PUT    /api/connections/:id/quotas         # 手动设置额度

GET    /api/proxy-policies                 # 列出代理策略
POST   /api/proxy-policies                 # 创建代理策略
PUT    /api/proxy-policies/:id             # 更新代理策略
DELETE /api/proxy-policies/:id             # 删除代理策略
```

#### 路由管理

```
GET    /api/routes                         # 列出所有路由
POST   /api/routes                         # 创建路由
GET    /api/routes/:id                     # 获取路由详情（含 stages）
PUT    /api/routes/:id                     # 更新路由
DELETE /api/routes/:id                     # 删除路由

POST   /api/routes/:id/stages              # 添加 stage
PUT    /api/routes/:id/stages/:stage_id    # 更新 stage
DELETE /api/routes/:id/stages/:stage_id    # 删除 stage

POST   /api/routes/:id/stages/:stage_id/candidates   # 添加候选
PUT    /api/routes/:id/stages/:stage_id/candidates/:candidate_id  # 更新候选
DELETE /api/routes/:id/stages/:stage_id/candidates/:candidate_id  # 删除候选

POST   /api/routes/:id/test                # 测试路由（发送测试请求）
# body: { prompt: string, stream: bool }
```

#### 计费与预算

```
GET    /api/billing/summary                # 计费总览
# query: period=daily|weekly|monthly, dimension=endpoint|credential|route|model

GET    /api/billing/usage                  # 用量查询
# query: start, end, dimension, dimension_id, period

GET    /api/billing/pricings               # 定价列表
POST   /api/billing/pricings               # 添加/更新定价
DELETE /api/billing/pricings/:id           # 删除定价

GET    /api/budget/config                  # 获取预算配置
PUT    /api/budget/config                  # 更新预算配置
# body: { enabled: bool, global: [...], routes: {...}, connections: {...} }

GET    /api/budget/status                  # 当前预算状态
# 返回各 scope 的当前花费、剩余、是否超限

GET    /api/rate-limits                    # 获取限流配置
PUT    /api/rate-limits                    # 更新限流配置
```

#### 日志与指标

```
GET    /api/logs/requests                  # 请求日志
# query: start, end, route_id, endpoint_id, error_class, status, page, page_size, sort

GET    /api/logs/requests/:id              # 单个请求详情（含 attempts）
GET    /api/logs/requests/:id/attempts     # 请求的所有尝试记录

GET    /api/logs/events                    # 事件日志
# query: start, end, kind, severity, page, page_size

GET    /api/metrics/dashboard              # 仪表盘聚合数据
# 返回：当前 QPS、错误率、P95 延迟、缓存命中率、今日费用、活跃连接状态

GET    /api/metrics/timeseries             # 时间序列数据
# query: metric=input_tokens|output_tokens|cost|error_rate|latency_p95|cache_hit_rate
#        dimension, dimension_id, period, start, end

POST   /api/logs/export                    # 导出日志
# body: { format: "json" | "csv", start, end, fields: [...] }
```

#### 健康检测

```
GET    /api/health/endpoints               # 所有 endpoint 的健康状态
GET    /api/health/endpoints/:id           # 单个 endpoint 健康详情
GET    /api/health/endpoints/:id/checks    # 健康检查历史
# query: level=L0|L1|L2, start, end, page, page_size

POST   /api/health/endpoints/:id/check     # 手动触发检查
# body: { level: "L0" | "L1" | "L2" }

GET    /api/health/config                  # 健康检测配置
PUT    /api/health/config                  # 更新健康检测配置
# body: { l0_interval_minutes, l1_interval_hours, mad_threshold, enabled }
```

#### 配置

```
GET    /api/config                         # 获取应用配置
PUT    /api/config                         # 更新应用配置
# body: { consumer_auth_enabled, gateway_cache_enabled, race_input_token_limit, ... }

GET    /api/config/export                  # 导出配置（脱敏）
POST   /api/config/import                  # 导入配置

POST   /api/system/restart                 # 重启数据面
POST   /api/system/checkpoint              # 手动执行 SQLite checkpoint
```

---
## 8. 核心流程定义


### 8.1 请求处理完整流程

```
消费者请求 → 8787
  │
  ├─ 1. 鉴权层（如果启用 consumer_auth）
  │    └─ 验证 Bearer token（SHA-256 hash 比对）
  │
  ├─ 2. 请求解析
  │    ├─ 识别 model 字段：是否为 Route 名
  │    ├─ 解析 OpenAI 格式 → CanonicalRequest
  │    ├─ 提取 x_gateway_* 扩展字段
  │    └─ 验证请求合法性（max_tokens 硬顶等）
  │
  ├─ 3. 幂等缓存检查（如果 idempotency_key 存在）
  │    └─ 命中 → 直接返回缓存响应
  │
  ├─ 4. 路由引擎
  │    ├─ 预算检查（如启用）
  │    ├─ 限流检查
  │    ├─ 加载 Route 配置
  │    ├─ 粘滞会话检查
  │    └─ Stage 链执行
  │         ├─ 对每个 Stage：
  │         │    ├─ Single：串行尝试（带重试）
  │         │    │    ├─ 熔断器检查
  │         │    │    ├─ 冷却检查
  │         │    │    ├─ 执行请求
  │         │    │    ├─ 失败判定（四层分类）
  │         │    │    ├─ 按 failure_rules 决策
  │         │    │    └─ 推送 gateway.notice
  │         │    └─ Race：并发尝试
  │         │         ├─ 输入 token 检查（阈值）
  │         │         ├─ 并发启动多个候选
  │         │         ├─ 按采纳策略等待
  │         │         ├─ 取消其他分支
  │         │         ├─ 记录被丢弃分支成本
  │         │         └─ 推送 gateway.notice
  │         └─ 所有 Stage 失败 → 返回错误
  │
  ├─ 5. 响应转换
  │    ├─ CanonicalResponse → OpenAI 格式
  │    ├─ 附加 x_gateway_metadata
  │    └─ 记录日志（request_logs + attempts）
  │
  ├─ 6. 计费记录
  │    ├─ 计算费用
  │    ├─ 更新额度（Coding Plan）
  │    └─ 检查预算（如启用）
  │
  └─ 7. 返回响应
       ├─ 非流式：JSON 响应
       └─ 流式：SSE 流（含 gateway.notice 事件）

旁路异步：
  - 指标聚合（rollup）
  - 健康检测调度
  - 日志轮转
```

### 8.2 失败判定逻辑

```rust
/// 对上游响应进行四层失败判定
async fn classify_upstream_result(
    result: &Result<CanonicalResponse>,
    http_status: Option<u16>,
) -> Result<CanonicalResponse> {
    match result {
        Ok(response) => {
            // 协议层校验
            if response.message.content.is_empty() {
                return Err(LlmgwError::Protocol("empty content in response".into()));
            }

            // 语义层校验
            if response.stop_reason == Some(StopReason::ContentFiltered) {
                return Err(LlmgwError::Semantic("content filtered by upstream".into()));
            }
            if response.stop_reason == Some(StopReason::MaxTokens)
                && response.usage.output_tokens >= response.usage.total_tokens.saturating_sub(10)
            {
                // 可能截断
                return Err(LlmgwError::Semantic("response possibly truncated".into()));
            }

            Ok(response.clone())
        }
        Err(e) => {
            // 根据错误类型分类
            match e {
                LlmgwError::Transport(_) => {
                    Err(LlmgwError::Transport(e.to_string().into()))
                }
                LlmgwError::HttpError { status, body } => {
                    match status {
                        401 | 403 => Err(LlmgwError::HttpError {
                            status: *status,
                            body: body.clone(),
                        }),
                        429 => Err(LlmgwError::HttpError {
                            status: 429,
                            body: "rate limited".into(),
                        }),
                        500..=599 => Err(LlmgwError::HttpError {
                            status: *status,
                            body: body.clone(),
                        }),
                        _ => Err(LlmgwError::Protocol(format!(
                            "unexpected http status: {}",
                            status
                        ))),
                    }
                }
                LlmgwError::Protocol(_) => Err(e.clone()),
                LlmgwError::Semantic(_) => Err(e.clone()),
                _ => Err(LlmgwError::Internal(e.to_string())),
            }
        }
    }
}
```

### 8.3 预算熔断流程

```
请求进入 → 检查 enabled 标志
  │
  ├─ 如果 enabled == false → 直接放行
  │
  ├─ 检查全局预算（日/周/月）
  │    ├─ 当前花费 >= 限制
  │    │    ├─ action == Warn → 推送 gateway.notice（budget_warning），放行
  │    │    ├─ action == Reject → 推送 gateway.notice（budget_exceeded），返回 429
  │    │    └─ action == Downgrade → 切换到降级路由
  │    └─ 当前花费 < 限制 → 放行
  │
  ├─ 检查 Route 预算
  │    └─ 同上逻辑
  │
  └─ 检查 Connection 预算（credential）
       └─ 同上逻辑

请求完成 → 记录花费 → 更新所有相关预算计数器
  │
  └─ 异常速率检测（每 5 分钟滚动窗口）
       ├─ 计算过去 1 小时花费速率 vs 过去 24 小时平均速率
       ├─ 如果速率 > 3x 平均 → 推送 anomaly 告警
       └─ 如果速率 > 10x 平均 → 自动暂停（如果配置允许）
```

### 8.4 健康检测调度

```
调度器启动
  │
  ├─ L0 心跳定时器（默认每 60 分钟）
  │    └─ 对每个 enabled endpoint：
  │         ├─ 发送 ~50 token 的 ping 请求
  │         ├─ 记录 TTFT、TPOT、HTTP 状态
  │         ├─ 计算响应指纹
  │         ├─ 与基线比较（MAD 判定）
  │         ├─ 与入网指纹比较
  │         └─ 更新健康状态
  │              ├─ 正常 → healthy
  │              ├─ 漂移 → degraded（推送告警）
  │              └─ 失败 → down（连续 3 次失败）
  │
  ├─ L1 能力探针定时器（默认每 6 小时）
  │    └─ 对每个 enabled endpoint：
  │         ├─ 发送 ~2k token 的能力测试
  │         ├─ 评估指令跟随、代码补全、逻辑推理
  │         ├─ 计算 capability_score（0-1）
  │         └─ 与基线比较
  │              ├─ 下降 > 3 MAD → 推送降智告警
  │              └─ 正常 → 更新基线
  │
  └─ L2 深度鉴定（手动或告警触发）
       └─ 对指定 endpoint：
            ├─ 运行基准测试子集（~50 题）
            ├─ 计算综合得分
            └─ 生成鉴定报告
```

---
## 9. 错误处理体系


### 9.1 HTTP 状态码映射


| 内部错误类型 | HTTP 状态码 | 消费者 API 响应体 |
|---|---|---|
| `LlmgwError::Transport` | 502 Bad Gateway | `{"error": {"message": "upstream transport error", "type": "llmgw_transport_error"}}` |
| `LlmgwError::HttpError { status: 429, .. }` | 429 Too Many Requests | `{"error": {"message": "rate limited", "type": "llmgw_rate_limited"}}` |
| `LlmgwError::HttpError { status, .. }` | 502 Bad Gateway | `{"error": {"message": "...", "type": "llmgw_upstream_error", "upstream_status": status}}` |
| `LlmgwError::Protocol` | 502 Bad Gateway | `{"error": {"message": "...", "type": "llmgw_protocol_error"}}` |
| `LlmgwError::Semantic` | 422 Unprocessable Entity | `{"error": {"message": "...", "type": "llmgw_semantic_error"}}` |
| `LlmgwError::BudgetExceeded` | 429 Too Many Requests | `{"error": {"message": "...", "type": "llmgw_budget_exceeded"}}` |
| `LlmgwError::RateLimited` | 429 Too Many Requests | `{"error": {"message": "...", "type": "llmgw_rate_limited"}}` |
| `LlmgwError::CircuitBreakerOpen` | 503 Service Unavailable | `{"error": {"message": "...", "type": "llmgw_circuit_open"}}` |
| `LlmgwError::Validation` | 400 Bad Request | `{"error": {"message": "...", "type": "llmgw_validation_error"}}` |
| `LlmgwError::Unauthorized` | 401 Unauthorized | `{"error": {"message": "...", "type": "llmgw_unauthorized"}}` |
| `LlmgwError::NotFound` | 404 Not Found | `{"error": {"message": "...", "type": "llmgw_not_found"}}` |
| `LlmgwError::Internal` | 500 Internal Server Error | `{"error": {"message": "...", "type": "llmgw_internal_error"}}` |


### 9.2 重试策略

- **默认重试次数**：2 次（每个候选）
- **重试延迟**：指数退避（100ms → 500ms → 2s），带抖动
- **不可重试错误**：`Validation`、`Unauthorized`、`Semantic`（内容过滤类）
- **可重试错误**：`Transport`（连接类）、`HttpStatus(429)`、`HttpStatus(5xx)`、`Protocol`（解析失败）


### 9.3 熔断器设计

```rust
pub struct CircuitBreaker {
    state: Arc<RwLock<HashMap<String, BreakerState>>>,
}

#[derive(Debug, Clone, Copy)]
pub enum BreakerState {
    Closed { consecutive_success: u32 },
    Open { opened_at: chrono::DateTime<chrono::Utc> },
    HalfOpen { trial_requests: u32 },
}

impl CircuitBreaker {
    /// 失败阈值：连续 5 次失败 → 打开
    const FAILURE_THRESHOLD: u32 = 5;
    /// 打开后的冷却时间：60 秒
    const COOLDOWN_SECONDS: i64 = 60;
    /// 半开状态允许的试用请求数：1
    const HALF_OPEN_MAX_TRIALS: u32 = 1;

    pub fn record_failure(&self, endpoint_id: &str) {
        // 连续失败计数 +1
        // 如果 >= FAILURE_THRESHOLD → Open
    }

    pub fn record_success(&self, endpoint_id: &str) {
        // 重置为 Closed
    }

    pub fn is_open(&self, endpoint_id: &str) -> bool {
        // Open 状态且冷却时间未到 → true
        // Open 状态且冷却时间已到 → HalfOpen，允许 1 个试用请求
    }
}
```

### 9.4 故障归因分离（D4 决策）

```rust
/// 故障归因分析器
pub struct AttributionAnalyzer {
    recent_failures: Arc<RwLock<VecDeque<FailureRecord>>>,
}

#[derive(Debug, Clone)]
pub struct FailureRecord {
    pub endpoint_id: String,
    pub error_class: FailureClass,
    pub proxy_policy_id: Option<String>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

impl AttributionAnalyzer {
    /// 分析过去 N 分钟内的故障模式
    pub fn analyze(&self, window_minutes: i64) -> AttributionReport {
        let now = chrono::Utc::now();
        let cutoff = now - chrono::Duration::minutes(window_minutes);

        let recent: Vec<_> = self.recent_failures.read()
            .iter()
            .filter(|f| f.timestamp > cutoff)
            .cloned()
            .collect();

        let total = recent.len();
        let transport_count = recent.iter()
            .filter(|f| f.error_class == FailureClass::Transport)
            .count();
        let http_count = recent.iter()
            .filter(|f| matches!(f.error_class, FailureClass::HttpStatus(_)))
            .count();

        // 判断：同一 proxy 下的多个 endpoint 同时出现 transport 故障
        // → 很可能是代理故障，而非模型故障
        let proxy_grouped: HashMap<Option<String>, Vec<&FailureRecord>> =
            recent.iter().group_by(|f| f.proxy_policy_id.clone());

        let proxy_issue = proxy_grouped.iter().any(|(proxy_id, failures)| {
            if let Some(pid) = proxy_id {
                let distinct_endpoints: HashSet<_> = failures.iter()
                    .map(|f| &f.endpoint_id)
                    .collect();
                distinct_endpoints.len() >= 2
                    && failures.iter().all(|f| f.error_class == FailureClass::Transport)
            } else {
                false
            }
        });

        AttributionReport {
            total_failures: total,
            transport_ratio: transport_count as f64 / total.max(1) as f64,
            http_error_ratio: http_count as f64 / total.max(1) as f64,
            proxy_issue_suspected: proxy_issue,
            affected_endpoints: recent.iter().map(|f| f.endpoint_id.clone()).collect(),
        }
    }
}

pub struct AttributionReport {
    pub total_failures: usize,
    pub transport_ratio: f64,
    pub http_error_ratio: f64,
    pub proxy_issue_suspected: bool,
    pub affected_endpoints: Vec<String>,
}
```

---
## 10. 测试策略


### 10.1 单元测试（Rust）


| 测试文件 | 覆盖内容 |
|---|---|
| `protocol/tests/openai_roundtrip.rs` | OpenAI 格式 ⇄ IR 往返转换（含 tools、streaming、vision） |
| `protocol/tests/anthropic_roundtrip.rs` | Anthropic 格式 ⇄ IR 往返转换（含 thinking 块、tool_use signature） |
| `routing/failure.rs` | 四层失败判定：构造各类错误 → 验证分类正确 |
| `routing/circuit_breaker.rs` | 熔断器状态机：失败阈值、冷却、半开 |
| `billing/budget.rs` | 预算计算：日/周/月周期边界、超限动作 |
| `billing/rate_limit.rs` | 限流器：RPM/TPM/并发限制 |
| `cache/prefix.rs` | 公共前缀分析：不同请求结构的分析结果 |
| `cache/inject.rs` | cache_control 注入：Anthropic/OpenAI 协议注入正确性 |
| `health/baseline.rs` | MAD 漂移检测：构造漂移/非漂移数据 |
| `health/fingerprint.rs` | 响应指纹：相同/不同模型响应的指纹区分 |


### 10.2 集成测试

使用 `mockito` 模拟上游服务。测试 fixture：

```rust
// tests/common/mod.rs
pub async fn setup_test_app() -> (AppState, MockUpstreams) {
    // 1. 创建临时 SQLite 数据库
    // 2. 执行 migrations
    // 3. 创建测试 Provider/Credential/Endpoint/Route
    // 4. 启动 mockito mock 服务器
    // 5. 返回 AppState
}

pub struct MockUpstreams {
    pub openai_mock: mockito::ServerGuard,
    pub anthropic_mock: mockito::ServerGuard,
    pub flaky_mock: mockito::ServerGuard, // 模拟不稳定服务
}
```

| 测试文件 | 场景 |
|---|---|
| `tests/routing_chain.rs` | 链式 fallback：第一个 endpoint 返回 429 → 自动切换到第二个 |
| `tests/routing_race.rs` | 并发 race：两个候选同时请求，最快采纳，另一个取消 |
| `tests/routing_race_cost.rs` | race 被丢弃分支成本记录 |
| `tests/budget.rs` | 预算超限：warn/reject/downgrade 三种动作 |
| `tests/cache_inject.rs` | 长上下文请求 → cache_control 注入 → 上游缓存命中 |
| `tests/health.rs` | 健康检测：模拟降智 → 漂移告警 |
| `tests/consumer_api.rs` | 消费者 API 端到端：请求 → 路由 → 响应 |
| `tests/admin_api.rs` | 管理 API CRUD 操作 |


### 10.3 Mock 上游服务

`fixtures/mock_upstream/` 中的 Python 脚本，用于手动测试和 E2E 测试：

```python
# flaky_mock.py — 模拟不稳定服务
# 配置：每 3 个请求返回 1 次 429，每 5 个请求返回 1 次 500
# 用于测试 fallback 和熔断器
```

### 10.4 前端测试

使用 Vitest + React Testing Library 测试关键组件：
- 路由配置表单
- 连接测试面板
- 预算设置页面
- 日志过滤器


### 10.5 端到端验收测试脚本

```bash
# 手动 E2E 验收流程
# 1. 启动应用
cargo tauri dev

# 2. 验证消费者 API 可用
curl http://127.0.0.1:8787/healthz

# 3. 配置一个 Route（通过 UI 或 8788 API）
curl -X POST http://127.0.0.1:8788/api/routes \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"test-route","display_name":"Test Route"}'

# 4. 通过网关调用
curl -X POST http://127.0.0.1:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"test-route","messages":[{"role":"user","content":"Hello"}],"stream":false}'

# 5. 验证流式调用
curl -N -X POST http://127.0.0.1:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"test-route","messages":[{"role":"user","content":"Hello"}],"stream":true}'

# 6. 验证 fallback 通知
# 使用 flaky_mock 作为上游，观察 SSE 中的 gateway.notice 事件
```

---
## 11. 开发任务拆解

> 每个任务按依赖顺序排列。完成任务 N 后，才能开始依赖它的任务。


### Task 0：项目脚手架初始化

**依赖**：无

**输出**：
- `src-tauri/Cargo.toml` 完成
- `package.json` + `vite.config.ts` + `tailwind.config.ts` + `tsconfig.json` 完成
- `src-tauri/tauri.conf.json` 完成（含 tray-icon、autostart、updater 插件配置）
- `src-tauri/src/main.rs` 入口骨架：Tauri Builder + 启动 HTTP 服务器
- `src/` React 应用骨架：路由配置、6 个页面占位
- `src-tauri/migrations/0001_init.sql` 完成
- `src-tauri/src/error.rs` 完成
- `src-tauri/src/state.rs` 骨架完成（数据库连接 + 配置加载）

**验收**：
- `cargo build` 和 `npm run build` 通过
- 应用启动后 SQLite 数据库文件创建成功，所有表存在
- 8787 和 8788 端口监听成功（`/healthz` 返回 200）
- React 应用能连接到 8788 管理 API


---
### Task 1：Protocol 适配层 — Canonical IR + OpenAI/Anthropic 转换

**依赖**：Task 0

**输出**：
- `src-tauri/src/protocol/mod.rs`：Canonical IR 完整定义
- `src-tauri/src/protocol/openai.rs`：OpenAI ⇄ IR 双向转换
- `src-tauri/src/protocol/anthropic.rs`：Anthropic ⇄ IR 双向转换
- `src-tauri/src/protocol/tests/openai_roundtrip.rs`
- `src-tauri/src/protocol/tests/anthropic_roundtrip.rs`

**关键实现要求**：
- `thinking` 块带 `signature` 的无损转换
- `tool_result` 消息归属（`tool_use_id`）保持
- 工具调用跨协议转换时，不支持的协议明确返回错误
- 流式 chunk 的增量解析

**验收**：
- 所有往返测试通过（`cargo test protocol::tests`）
- 覆盖边界情况：空 content、多工具调用、嵌套 thinking、图片消息


---
### Task 2：Provider 适配器 — OpenAI + Anthropic + Generic

**依赖**：Task 1

**输出**：
- `src-tauri/src/egress/adapters/mod.rs`：`ProviderAdapter` trait 定义
- `src-tauri/src/egress/adapters/openai.rs`：OpenAI 适配器
- `src-tauri/src/egress/adapters/anthropic.rs`：Anthropic 适配器
- `src-tauri/src/egress/adapters/generic.rs`：通用 OpenAI 兼容适配器（中转站）
- `src-tauri/src/egress/transport.rs`：代理、TLS、连接池
- `src-tauri/src/egress/mod.rs`：`EgressClient`

**关键实现要求**：
- SSE 流式响应的字节级解析
- 错误响应的容错解析（R3 风险：中转站返回 200 但 body 是错误）
- 代理策略支持：直连、系统代理、SOCKS5/HTTP 自定义代理
- 超时控制：连接超时 30s、总超时 300s（SSE 长连接）

**验收**：
- 使用 `mockito` 模拟上游，测试 OpenAI 和 Anthropic 适配器的非流式和流式请求
- 测试中转站异常响应（200 状态码但 body 为错误 JSON）
- 测试代理连接


---
### Task 3：连接管理模块 — Provider/Credential/Endpoint CRUD + 网络测试

**依赖**：Task 2

**输出**：
- `src-tauri/src/db/providers.rs`、`db/credentials.rs`、`db/endpoints.rs`
- `src-tauri/src/server/admin.rs` 中的连接管理 handlers
- 网络测试逻辑（分层测试：TCP → TLS → HTTP → 小请求）

**关键实现要求**：
- 密钥存储：API key 存入 OS keychain，数据库仅存引用 ID
- 三层抽象：Provider → Credential → Endpoint
- Coding Plan 额度双轨：`source = api/manual/estimated`
- 多账号管理：分组、标签、启用/禁用、默认账号

**验收**：
- 通过 8788 API 完成 CRUD 操作
- API key 不出现在数据库文件中（验证 SQLite 文件中无明文 key）
- 网络测试返回分段计时


---
### Task 4：路由引擎 — Stage 执行器 + 四层失败判定 + 熔断器

**依赖**：Task 3

**输出**：
- `src-tauri/src/routing/mod.rs`：`RouteEngine`
- `src-tauri/src/routing/stage.rs`：Single/Race 执行器
- `src-tauri/src/routing/failure.rs`：四层失败判定
- `src-tauri/src/routing/circuit_breaker.rs`：熔断器
- `src-tauri/src/routing/cooldown.rs`：冷却管理
- `src-tauri/src/routing/attribution.rs`：故障归因
- `src-tauri/src/server/consumer.rs`：`POST /v1/chat/completions` handler
- `src-tauri/src/server/sse.rs`：SSE 流处理 + `gateway.notice` 事件推送
- `src-tauri/src/server/consumer.rs`：`GET /v1/events` handler
- `src-tauri/src/server/consumer.rs`：`GET /v1/models` handler

**关键实现要求**：
- Stage 链执行：Single 带重试 → 失败进入 NextStage
- Race 并发：仅当 input_tokens < 阈值（默认 4000）且配置允许
- 熔断器：连续 5 次失败打开，60s 冷却后半开
- 四层失败判定：Transport / HttpStatus / Protocol / Semantic
- `gateway.notice` SSE 事件在 fallback 时推送
- 故障归因分离：代理故障只告警不禁用模型
- 粘滞会话支持

**验收**：
- 集成测试 `tests/routing_chain.rs` 通过
- 集成测试 `tests/routing_race.rs` 通过
- 集成测试 `tests/routing_race_cost.rs` 通过（被丢弃分支成本记录）
- 模拟 429 → 自动切换 → 推送 `gateway.notice` 事件


---
### Task 5：计费引擎 + 预算熔断 + 限流器

**依赖**：Task 3

**输出**：
- `src-tauri/src/billing/mod.rs`：计费引擎
- `src-tauri/src/billing/pricing.rs`：价格管理
- `src-tauri/src/billing/quota.rs`：Coding Plan 额度双轨
- `src-tauri/src/billing/budget.rs`：三级预算熔断
- `src-tauri/src/billing/rate_limit.rs`：RPM/TPM/并发限流

**关键实现要求**：
- 按模型定价（输入/输出/缓存读/缓存写），支持价格变动回溯
- Coding Plan 额度 API 同步（如果 Provider 提供查询 API）
- 三级预算：全局 / Route / Connection
- 预算默认关闭，用户手动开启
- 开启后可选 Warn 或 Reject 动作
- 异常速率检测：滚动窗口，3x 告警，10x 自动暂停

**验收**：
- 集成测试 `tests/budget.rs` 通过
- 限流器单元测试通过
- 预算超限时正确触发 Warn/Reject 动作


---
### Task 6：可观测性 — 日志 + 指标 + Rollup

**依赖**：Task 4

**输出**：
- `src-tauri/src/observability/mod.rs`、`logger.rs`、`metrics.rs`、`rollup.rs`
- `src-tauri/src/db/logs.rs`：日志查询
- `src-tauri/src/db/rollups.rs`：聚合数据查询
- `src-tauri/src/server/admin.rs` 中的日志/指标 handlers
- 日志轮转逻辑
- 日志导出功能（JSON/CSV）

**关键实现要求**：
- 结构化日志：`request_logs` 和 `attempts` 表
- 聚合 rollup：每分钟/小时/天
- 仪表盘指标：QPS、错误率、P95 延迟、缓存命中率、费用
- 日志轮转：保留周期可配置（默认 30 天）
- 导出脱敏：API key 不导出

**验收**：
- 请求日志包含完整字段
- 仪表盘 API 返回正确的聚合数据
- 日志导出功能正常


---
### Task 7：缓存子系统 — 公共前缀分析 + cache_control 注入

**依赖**：Task 4

**输出**：
- `src-tauri/src/cache/mod.rs`：`CacheManager`
- `src-tauri/src/cache/prefix.rs`：公共前缀分析
- `src-tauri/src/cache/inject.rs`：cache_control 注入
- `src-tauri/src/cache/gateway_cache.rs`：网关侧精确缓存（默认关闭）
- `src-tauri/src/db/models.rs` 中的缓存相关表操作

**关键实现要求**：
- 公共前缀分析：识别 system prompt + 早期 tool 定义
- Anthropic：注入 `cache_control: {"type": "ephemeral"}` 断点
- OpenAI：确保请求结构稳定（自动前缀缓存不需要显式注入）
- 上游缓存命中率统计
- 网关侧精确缓存仅对显式 `idempotencyKey` 开放

**验收**：
- 集成测试 `tests/cache_inject.rs` 通过
- 长上下文请求正确注入 cache_control 断点
- 缓存命中率在日志中正确体现


---
### Task 8：健康检测 — L0/L1/L2 探针 + 基线漂移 + 响应指纹

**依赖**：Task 3

**输出**：
- `src-tauri/src/health/mod.rs`：`HealthManager`
- `src-tauri/src/health/probes.rs`：探针定义
- `src-tauri/src/health/baseline.rs`：滑动基线 + MAD 检测
- `src-tauri/src/health/fingerprint.rs`：响应指纹
- `src-tauri/src/health/scheduler.rs`：定时调度
- `src-tauri/src/db/health.rs`：健康检测数据操作
- `src-tauri/src/server/admin.rs` 中的健康检测 handlers

**关键实现要求**：
- L0 心跳：默认每 60 分钟，~50 token，记录 TTFT/TPOT/指纹
- L1 能力探针：默认每 6 小时，~2k token，评估指令跟随/代码补全/逻辑
- L2 深度鉴定：手动触发，运行基准子集
- MAD 漂移检测：偏离 3 个 MAD 告警
- 响应指纹：入网时记录，L0 每次比对
- 自动降级/禁用

**验收**：
- 集成测试 `tests/health.rs` 通过
- 模拟降智（使用质量较差的 mock）→ 触发漂移告警
- 模拟模型调包（不同 mock 响应）→ 触发指纹不匹配


---
### Task 9：前端 UI — 连接管理 + 路由管理页面

**依赖**：Task 3, Task 4

**输出**：
- `src/pages/Connections.tsx`
- `src/pages/Routes.tsx`
- `src/components/dialogs/ConnectionForm.tsx`
- `src/components/dialogs/RouteForm.tsx`
- `src/components/dialogs/StageEditor.tsx`
- `src/api/connections.ts`、`src/api/routes.ts`
- `src/stores/connections.ts`、`src/stores/routes.ts`

**验收**：
- 能通过 UI 完成连接 CRUD
- 能通过 UI 完成路由配置（含 Stage 和 Candidate）
- 网络测试面板可用
- 路由测试可用


---
### Task 10：前端 UI — 仪表盘 + 计费/预算页面

**依赖**：Task 5, Task 6

**输出**：
- `src/pages/Dashboard.tsx`
- `src/pages/Billing.tsx`
- `src/components/charts/TokenUsageChart.tsx`
- `src/components/charts/CostChart.tsx`
- `src/components/charts/LatencyChart.tsx`
- `src/components/charts/CacheHitRateChart.tsx`
- `src/components/charts/ErrorRateChart.tsx`
- `src/components/dialogs/BudgetConfig.tsx`
- `src/api/billing.ts`、`src/stores/billing.ts`、`src/stores/dashboard.ts`

**验收**：
- 仪表盘显示实时指标
- 计费页面能按维度查看消耗
- 预算配置对话框可用


---
### Task 11：前端 UI — 日志 + 健康监控 + 设置页面

**依赖**：Task 6, Task 8

**输出**：
- `src/pages/Logs.tsx`
- `src/pages/Health.tsx`
- `src/pages/Settings.tsx`
- `src/components/tables/RequestLogTable.tsx`
- `src/components/tables/EventLogTable.tsx`
- `src/components/health/EndpointHealthCard.tsx`
- `src/components/health/HealthCheckHistory.tsx`
- `src/components/dialogs/ExportDialog.tsx`
- `src/api/logs.ts`、`src/api/health.ts`、`src/api/config.ts`

**验收**：
- 日志页支持过滤、分页、详情查看
- 健康页显示所有 endpoint 状态和历史
- 设置页能修改所有配置项


---
### Task 12：运维与发布 — 日志轮转 + 配置导入导出 + 托盘 + 自动更新

**依赖**：Task 9, Task 10, Task 11

**输出**：
- 日志轮转定时任务
- 配置导出（脱敏）/导入
- 系统托盘菜单（显示面板、暂停网关、退出）
- 自动启动配置
- 自动更新
- 打包脚本（macOS dmg、Windows msi/nsis、Linux AppImage）

**验收**：
- 日志轮转按配置执行
- 配置导入导出往返测试通过
- 托盘操作正常
- 打包产物可安装


---
### Task 13：安全加固 + 最终集成测试

**依赖**：所有前置任务

**输出**：
- 消费者 API token 鉴权
- 管理 API token 轮换
- SQLite 加密（可选）
- 完整 E2E 测试
- 性能测试（1k 并发请求）

**验收**：
- 安全扫描无高危漏洞
- E2E 验收流程全部通过
- 性能基准达标


---
## 12. 验收标准


### 12.1 功能验收清单


| # | 功能 | 验收方法 | 通过条件 |
|---|---|---|---|
| 1 | 消费者 API 基础转发 | `curl` 调用 `POST /v1/chat/completions` | 返回有效响应 |
| 2 | 流式响应 | `curl -N` 调用流式 | SSE 流正确输出 |
| 3 | 多 Provider 连接 | UI 配置 3+ 家服务商 | 网络测试全部通过 |
| 4 | 链式 fallback | 模拟第一个上游 429 | 自动切换到第二个，推送 `gateway.notice` |
| 5 | 并发 race | 两个候选并发请求 | 最快有效响应被采纳，其他被取消 |
| 6 | race 成本记录 | race 场景 | `race_wasted_cost_usd` 正确记录 |
| 7 | 预算熔断 | 设置低预算 → 触发 | Warn 或 Reject 动作正确 |
| 8 | 限流 | 设置 RPM=10 → 快速发送 11 个请求 | 第 11 个被拒绝 |
| 9 | 粘滞会话 | 设置 `session_key` | 连续请求使用同一 endpoint |
| 10 | cache_control 注入 | 长上下文请求 | 上游响应包含缓存命中信息 |
| 11 | Coding Plan 额度 | 配置额度 → 消耗 | 额度正确扣减 |
| 12 | 日志记录 | 发送请求 → 查询日志 | 日志包含完整字段 |
| 13 | 指标聚合 | 多次请求 → 查询仪表盘 | 聚合数据正确 |
| 14 | 健康检测 L0 | 手动触发 | 返回健康状态 |
| 15 | 健康检测 L1 | 手动触发 | 返回能力评分 |
| 16 | 降智告警 | 模拟低质量响应 | 漂移告警触发 |
| 17 | 响应指纹 | 模拟模型调包 | 指纹不匹配告警 |
| 18 | 配置导入导出 | 导出 → 清空 → 导入 | 配置完全恢复（密钥除外） |
| 19 | 密钥安全 | 检查 SQLite 文件 | 无明文 API key |
| 20 | 托盘操作 | 最小化 → 托盘 → 恢复 | 正常 |
| 21 | Anthropic 直通 | `POST /v1/messages` | 返回 Anthropic 格式响应 |
| 22 | 模型列表 | `GET /v1/models` | 返回 Route + 上游模型 |


### 12.2 性能基准


| 指标 | 目标 |
|---|---|
| 非流式请求转发延迟（不含上游） | < 10ms |
| 流式首字节延迟（不含上游） | < 20ms |
| 1000 并发请求错误率 | < 1% |
| SQLite 写入延迟 | < 5ms（P95） |
| 前端首屏加载 | < 2s |
| 应用启动时间 | < 5s（含数据库初始化） |
| 内存占用（空闲） | < 200MB |
| 内存占用（高负载） | < 500MB |


### 12.3 发布门槛

- [ ] 所有单元测试通过
- [ ] 所有集成测试通过
- [ ] E2E 验收清单全部通过
- [ ] `cargo clippy` 无 warning
- [ ] `cargo fmt --check` 通过
- [ ] `npm run lint` 通过
- [ ] 安全审计无高危
- [ ] 打包产物在三平台（macOS/Windows/Linux）安装成功


---

*本文档是 LLMGW 项目的工程开发规格，可直接提交给 AI 开发 Agent 执行。*
*任何架构或接口的变更需要更新本文档并提升版本号。*


# AI反馈
这份计划书整体架构清晰、模块划分合理，但在**失败分类与路由规则的匹配逻辑**、**流式 fallback 语义**、**Race 取消的成本归集**以及**前端与管理 API 的鉴权衔接**上存在若干实质性缺陷。以下是逐项审查结果。


---
## 一、致命缺陷（会直接导致功能无法工作）


### 1.1 `FailureClass::as_str()` 与失败规则 key 不匹配

**位置**：§5.1 `error.rs` + §5.3 `FailureRules`

**问题**：

```rust
// error.rs 中定义
FailureClass::HttpStatus(_) => "http_status",
```

但 `FailureRules` 的示例明确使用：

```json
{"transport":"retry","http_429":"next_stage","http_5xx":"next_stage"}
```

`as_str()` 对 `HttpStatus(429)` 返回的是 `"http_status"`，不是 `"http_429"`。这意味着任何按 HTTP 状态码细分的失败规则**永远不会被匹配到**。429 和 500 会被同等对待，用户无法为不同状态码配置不同策略（例如 429 应该 next_stage，500 应该 retry）。

**修复建议**：`as_str()` 需要改为动态方法或增加一个 `as_rule_key()` 方法：

```rust
impl FailureClass {
    pub fn as_rule_key(&self) -> String {
        match self {
            FailureClass::HttpStatus(429) => "http_429".into(),
            FailureClass::HttpStatus(s) if *s >= 500 => "http_5xx".into(),
            FailureClass::HttpStatus(s) if *s >= 400 => "http_4xx".into(),
            FailureClass::Transport => "transport".into(),
            FailureClass::Protocol => "protocol".into(),
            FailureClass::Semantic => "semantic".into(),
        }
    }
}
```

同时在路由执行伪代码 §6.2 中，`class.as_str()` 的调用处也应改为 `class.as_rule_key()`。


---
### 1.2 流式请求中途失败时无 fallback 语义

**位置**：§6.2 路由执行算法 + §8.1 请求处理流程

**问题**：文档定义了非流式请求的完整 fallback 链。但对于流式请求，一旦第一个 endpoint 已开始向消费者发送 SSE chunk，如果中途失败（连接断开、上游 500、内容被过滤），此时：

- 已经发送给消费者的部分响应**无法撤回**。
- 如果切换到下一个 endpoint，消费者将收到两个不同的、不连续的响应片段。
- 文档没有定义这种场景下的行为：是直接终止流？还是发送一个错误事件？还是尝试无缝续接（技术上几乎不可能）？

**影响**：Claude Code 等 Agent 客户端在流中途收到错误后，行为不可预测。这比非流式 fallback 的问题严重得多，因为 Agent 可能已经基于部分输出开始执行工具调用。

**修复建议**：在 §8.1 中明确定义流式请求的 fallback 策略。推荐方案：
- **首字节之前失败**：可以静默 fallback（消费者尚未收到任何数据）。
- **首字节之后失败**：不 fallback，发送 `error` SSE 事件（OpenAI 格式的 `{"error": {...}}` 或自定义事件），终止流。
- 在 `request_logs` 中记录 `stream_interrupted: true` 标记。


---
### 1.3 Race 取消分支的成本无法准确归集

**位置**：§6.2 Race 执行逻辑 + §12.1 验收项 #6

**问题**：文档要求记录 `race_wasted_cost_usd`（被丢弃分支的成本），且验收标准明确要求"race 成本记录正确"。但实际工程中：

1. 当 `drop(futures)` 取消其余分支时，底层 HTTP 请求可能尚未完成。上游提供商可能仍在生成 token 并计费。
2. 被取消的请求**无法从响应中获取 usage 信息**（因为响应未完整接收）。
3. 文档没有说明如何估算或追踪这部分成本。

**影响**：`race_wasted_cost_usd` 将长期为 0 或严重低估，无法满足验收标准。

**修复建议**：
- 方案 A：仅在非流式 race 中记录 waste cost（可以从已完成的响应中获取 usage）。流式 race 不启用或不计 waste cost。
- 方案 B：使用启发式估算——基于已发送的请求 token 数和已接收的部分输出 token 数进行估算，标注 `estimated: true`。
- 方案 C：修改验收标准，将 waste cost 限定为"已完整接收但未采纳的分支"的成本，被中途取消的分支不计数。
- 同时，`drop(futures)` 并不能保证取消底层 HTTP 请求。应使用 `tokio_util::sync::CancellationToken` 或 `futures::future::AbortHandle` 配合 reqwest 的 `RequestBuilder::abort()` 能力。


---
## 二、严重设计缺陷（需要架构调整）


### 2.1 管理 API token 的获取链路不明确

**位置**：§7.2 管理 API + §1.3 进程与生命周期

**问题**：文档说"admin_token 在应用启动时生成，存储在本地文件中"。但前端 React 应用如何获取这个 token？两种可能的路径：

- **路径 A**：前端通过 Tauri IPC 获取 token。但文档中 `tauri_cmds.rs` 的职责描述是"窗口/托盘/密钥/导出"，**没有包含** token 获取命令。
- **路径 B**：前端直接读取本地文件。但浏览器环境（WebView）无法访问任意文件路径，除非通过 Tauri 的 fs 插件暴露。

**影响**：如果这个链路不明确，前端无法调用 8788 管理 API，整个 UI 将不可用。

**修复建议**：
- 在 `tauri_cmds.rs` 中增加 `get_admin_token` IPC 命令，通过 Tauri 的 capability 机制限制仅主窗口可调用。
- 或者放弃 8788 的 HTTP 鉴权，改为仅监听 `127.0.0.1` + 使用 Tauri IPC 进行所有前端通信（但这样 8788 就失去了外部可编程性）。
- 推荐前一种方案，同时在 §6.1 `AppState` 中明确 admin_token 的生成、存储路径和权限（如 `0600`）。


---
### 2.2 `notify_mode` 字段定义了但从未使用

**位置**：§4.1 `routes` 表 + §5.3 `RouteConfig` + §6.2 路由执行

**问题**：`routes` 表有 `notify_mode` 字段（`"sse_event" | "sse_comment" | "none"`），`RouteConfig` 中也包含 `notify_mode`。但路由执行伪代码中**从未读取或使用**这个字段。`GatewayNotice` 始终以 SSE 自定义事件形式推送。

**影响**：
- 用户配置了 `notify_mode = "none"` 但仍然收到通知。
- `"sse_comment"` 模式的实现完全缺失（这种模式可能是为了兼容无法处理自定义 SSE 事件的客户端，将通知作为注释嵌入 SSE data 中）。

**修复建议**：
- 在路由执行逻辑中，根据 `notify_mode` 决定 `GatewayNotice` 的发送方式。
- 或者从 v3.0 中移除 `notify_mode` 字段和 `sse_comment` 选项，简化为始终使用 `sse_event`，在后续版本中再加入。


---
### 2.3 直接调用上游模型（非 Route 名）的流程未定义

**位置**：§8.1 请求处理流程第 2 步 + §7.1 `GET /v1/models`

**问题**：`GET /v1/models` 返回 Route 虚拟模型和上游真实模型的混合列表。这意味着消费者可以使用上游模型名（如 `"gpt-4o"`）直接调用。但 §8.1 的流程只描述了"识别 model 字段：是否为 Route 名"，**没有定义非 Route 名时的处理逻辑**。

**影响**：
- 如果消费者用 `"gpt-4o"` 调用，路由引擎如何处理？是报错？还是自动创建一个隐式的单 endpoint 路由？
- 如果有多个 credential 都配置了 `gpt-4o`，选哪个？
- 文档中 `credentials` 表有 `is_default` 字段，暗示了某种默认选择机制，但没有在请求流程中体现。

**修复建议**：在 §8.1 中明确：
- 如果 `model` 匹配 Route 名 → 走路由引擎。
- 如果 `model` 匹配某个 endpoint 的模型名 → 使用该 endpoint 所属 credential 中 `is_default=1` 的那个 endpoint 直连。
- 如果多个默认 credential 都有该模型 → 返回错误要求消费者指定 Route。
- 如果没有匹配 → 404。


---
### 2.4 流式请求的预算控制未定义

**位置**：§8.3 预算熔断流程 + §6.5 `BudgetManager`

**问题**：预算检查在"请求前"执行。对于流式请求，实际 token 消耗在请求完成后才知道。如果流式请求在生成过程中超过了预算限额：

- 是否中断流？
- 中断后如何通知消费者？
- 已经产生的费用如何记录？

文档完全没有涉及这个场景。

**修复建议**：
- 流式请求在预算检查时使用**预估 token 上限**（`max_tokens`）进行预检。如果预估费用会超限，直接拒绝。
- 实际费用在流结束后结算。如果实际费用超过预算，触发预算告警但不中断流。
- 对于极端的超限场景（如实际花费达到预算的 150%），可选中断流并发送错误事件。


---
## 三、重要问题（需要修正但不会导致完全不可用）


### 3.1 `StageCandidateConfig` 缺少 `retry_count` 字段

**位置**：§4.1 `stage_candidates` 表有 `retry_count` 字段 vs §5.3 `StageCandidateConfig` 结构体没有

`stage_candidates` 表定义了 `retry_count INTEGER NOT NULL DEFAULT 2`，但 `StageCandidateConfig` 结构体中没有这个字段。而在 `StageStrategy::Single` 中有 `retries: u8`。这意味着从数据库加载配置时，`retry_count` 被放到了 `StageStrategy::Single` 而不是 `StageCandidateConfig` 中。对于 Race 策略中的每个候选，也需要独立的重试次数吗？文档没有说明。

**建议**：将 `retry_count` 加入 `StageCandidateConfig`，使 Single 和 Race 的候选配置结构统一。


---
### 3.2 `endpoints` 表中 `provider_id` 冗余

`endpoints` 表同时有 `credential_id` 和 `provider_id`。但 `credentials` 表已经关联了 `provider_id`。如果数据不一致（credential 的 provider_id 与 endpoint 的 provider_id 不同），以哪个为准？

**建议**：移除 `endpoints.provider_id`，通过 JOIN `credentials` 获取。或者保留但添加数据库级约束确保一致性。


---
### 3.3 限流器算法描述矛盾

§6.6 标题写"滑动窗口限流器（令牌桶 + 滑动窗口）"，但 `TokenBucket` 结构体的字段（`current_rpm`、`window_start`）是**固定窗口计数器**的实现方式，不是令牌桶也不是滑动窗口。

**建议**：要么修改结构体实现真正的滑动窗口或令牌桶，要么修改文档描述为"固定窗口计数器"。


---
### 3.4 `tauri_cmds.rs` 接口未定义

§3 目录结构中提到了 `tauri_cmds.rs`，§1.2 架构图也标注了 Tauri IPC 负责"窗口/托盘/密钥/自启"。但全文**没有定义任何具体的 Tauri IPC 命令签名**。对于 AI Agent 来说，这意味着无法实现这些功能。

**建议**：在 §6 模块接口规范中增加 Tauri IPC 命令的接口定义。


---
### 3.5 前端 API 客户端的 CORS 策略未定义

前端运行在 Tauri WebView 中，通过 HTTP 调用 8788 管理 API。WebView 的 origin 可能是 `tauri://localhost` 或 `http://localhost:5173`（开发模式）。8788 服务器的 CORS 策略需要允许这些 origin。但文档中 `tower-http` 的 CORS 特性已启用，但**没有定义具体的 CORS 配置**。

**建议**：在 §7.2 中明确 CORS 策略：允许 `tauri://localhost` 和 `http://localhost:5173`，仅允许 `Authorization` 和 `Content-Type` 头。


---
### 3.6 `GET /v1/events` 缺少鉴权说明

§7.1 中 `GET /v1/events` 暴露在 8787 消费者 API 上，但没有说明是否需要鉴权。如果 `consumer_auth_enabled` 为 false（默认），任何本地进程都可以订阅所有事件（包括 fallback 通知、预算信息等）。

**建议**：明确此端点的鉴权策略。建议即使是消费者 API，`/v1/events` 也需要独立的 token 鉴权。


---
### 3.7 熔断器与 cooldown 机制重叠

§9.3 熔断器有 `COOLDOWN_SECONDS = 60`，§4.1 `endpoints` 表有 `cooldown_until` 字段，§3 目录中有独立的 `cooldown.rs` 模块。这三者之间的关系不清晰。

**建议**：明确职责划分。推荐方案：熔断器管理连续失败的自动断路；cooldown 管理单次失败后的冷却期（如 429 后的退避）；两者互不重叠但协同工作。


---
### 3.8 Mock 上游服务使用 Python 增加测试复杂度

§10.3 中的 `fixtures/mock_upstream/` 使用 Python 脚本。但 §10.2 中的集成测试使用 `mockito`（Rust）。这意味着：
- 运行集成测试只需要 Rust（mockito 是 Rust crate）。
- 运行 E2E 测试需要 Python 环境。

对于"可直接提交给 AI 开发 Agent 执行"的文档来说，这种混合增加了环境配置复杂度。**建议**：将 Python mock 替换为 Rust 实现（可以复用 `mockito` 或使用 `axum` 构建独立的 mock 服务器），或者明确 Python mock 仅用于手动测试而非自动化测试。


---
## 四、遗漏与待补充项


| # | 遗漏项 | 位置 | 建议 |
|---|---|---|---|
| 1 | 消费者断开连接时上游请求的取消 | §8.1 | 需要处理 SSE 消费者断开时的上游取消 |
| 2 | `CanonicalStreamChunk` 缺少 message ID | §5.2 | 流式响应中无法关联工具调用与消息 |
| 3 | 工具调用参数的增量合并规则 | §5.2 | `ToolUseDelta { input_delta: Value }` 如何合并成完整参数？ |
| 4 | Anthropic 格式流式响应中的 `gateway.notice` | §7.1 | Anthropic SSE 格式有严格的 event 类型，自定义事件如何处理？ |
| 5 | Provider API 版本管理 | §2 | 不同版本的 OpenAI/Anthropic API 如何处理？ |
| 6 | 日志轮转的具体实现细节 | Task 6 | 是删除还是归档？批量删除的性能影响？ |
| 7 | 配置导入时密钥的处理流程 | §7.2 | 导入的配置不含密钥，用户如何重新输入？ |
| 8 | 前端暗色模式 | §3 前端 | 桌面应用基本需求 |
| 9 | 多语言支持 | §3 前端 | 未提及 |
| 10 | 性能测试的具体方法论 | Task 13, §12.2 | 使用什么工具？如何测量？ |
| 11 | 消费者 API 默认鉴权策略 | §7.1 | `consumer_auth_enabled` 默认值未明确 |
| 12 | `daily_restart_enabled` 的实现 | §6.1 `AppConfig` | 定义了字段但没有说明实现机制 |
| 13 | SQLite 加密的可选项 | Task 13 | 标记为"可选"，但没有具体方案 |
| 14 | 粘滞会话的过期策略 | §4.3 `sticky_sessions` | 会话何时过期？如何清理？ |
| 15 | 网关侧缓存的并发控制 | §4.3 `gateway_cache_entries` | 多个并发相同请求如何处理？ |


---
## 五、建议的优先级排序


### P0（必须修复才能开始开发）

1. **§1.1**：`FailureClass::as_rule_key()` 修复
2. **§1.2**：流式 fallback 语义定义
3. **§1.3**：Race waste cost 的计算方案
4. **§2.1**：管理 API token 获取链路（Tauri IPC 命令）
5. **§2.3**：直接调用上游模型的流程


### P1（开发前需要决策）

6. **§2.2**：`notify_mode` 的实现或移除
7. **§2.4**：流式预算控制策略
8. **§3.3**：限流器算法统一
9. **§3.7**：熔断器与 cooldown 职责划分
10. **§3.4**：Tauri IPC 命令接口定义


### P2（开发过程中补充）

11. §3.5 CORS 策略
12. §3.6 事件流鉴权
13. §3.8 Mock 服务统一为 Rust
14. 遗漏项清单中的各项


---
## 六、总体评价

这份文档的**优点**是：

- 模块划分清晰，目录结构合理
- 数据模型覆盖了核心需求（路由、计费、健康、日志）
- Canonical IR 的设计考虑了多协议兼容
- 错误分类（四层失败）的框架有实用价值
- 任务拆解有依赖关系，可执行性较好

**核心不足**是：

- 流式场景的异常处理（fallback、预算、取消）严重欠缺，而这恰恰是 LLM 网关最复杂的部分
- 配置字段（如 `notify_mode`、`retry_count`）在 schema、类型定义和执行逻辑之间脱节
- 文档声称"可直接提交给 AI 开发 Agent 执行"，但仍有大量隐含决策需要在开发过程中由 Agent 自行判断，这会导致实现偏差

**建议**：在修复 P0 和 P1 问题后，将文档版本提升至 v3.1。对于无法在文档层面解决的问题（如 Race waste cost 的准确追踪），应明确标注为"已知限制"并提供降级方案，而不是让 AI Agent 自行发挥。
