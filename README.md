# 信息聚合 - 个人信息流阅读器

聚合多个技术信息源的静态网站，支持 RSS 订阅、Linux.do、Hacker News 和 GitHub Trending。

## 数据说明

### 原始抓取 vs 验证摘要

| 类型 | 说明 | 标记 |
|------|------|------|
| **原始抓取** | 从公开 Feed/API 直接获取的原始标题和摘要 | 黄色「原始标题」badge |
| **验证摘要** | 经过用户确认的精选内容摘要（未来功能） | 无标记或绿色标记 |

**当前所有内容均为原始抓取**，不包含 AI 生成的摘要或评论。

### 数据来源

| 来源 | 获取方式 | 更新说明 |
|------|----------|----------|
| RSS | 用户配置的 120+ 订阅源 | 构建时预生成 |
| Hacker News | Firebase API (topstories) | 构建时预生成 |
| GitHub Trending | 官方 Trending 页面 | 构建时预生成 |
| Linux.do | top.rss?period=daily | Cloudflare 保护，可能受限 |

## 架构

### 生产部署

- **静态数据**：文章数据在构建时预生成为 JSON，打包到部署包中
- **无数据库依赖**：不依赖 SQLite 或任何外部数据库
- **无在线刷新**：`/api/refresh` 端点已禁用，防止公开 API 被滥用

### 本地开发

```bash
npm install
npm run dev
```

### 更新数据流程

1. 本地运行数据获取脚本更新 `data/seed/` 中的 JSON
2. 提交并推送更改
3. 触发新的部署构建

## 功能特性

- **四源聚合**：RSS、Linux.do、Hacker News、GitHub Trending
- **统一视图**：最新汇总显示所有来源
- **关键词搜索**：标题和摘要搜索
- **日期筛选**：按日期范围过滤
- **分类过滤**：按来源分类筛选
- **本地收藏**：使用 localStorage 保存书签
- **响应式设计**：移动端和桌面端适配

## 安全说明

- ✅ 无登录/凭证收集
- ✅ 无私人用户信息存储
- ✅ 无付费 API 依赖
- ✅ 无在线刷新端点（防止滥用）
- ✅ 所有数据来自公开 Feed/API

## 技术栈

- **框架**：Next.js 16 (App Router)
- **语言**：TypeScript
- **样式**：Tailwind CSS 4
- **数据**：静态 JSON（构建时预生成）

## 目录结构

```
data/
└── seed/
    ├── articles.json    # 预生成的文章数据
    └── statuses.json    # 数据源状态

src/
├── app/
│   ├── api/
│   │   ├── articles/    # 文章列表 API
│   │   ├── status/      # 状态 API
│   │   └── refresh/     # 刷新 API (已禁用)
│   └── page.tsx
├── components/          # UI 组件
├── hooks/               # React Hooks
└── lib/
    ├── data-store.ts    # 数据层
    ├── rss-feeds.ts     # RSS 订阅配置
    └── types.ts
```

## 部署

### Vercel 部署

项目已配置为 Vercel 部署兼容：
- 静态数据打包在构建中
- 无服务器函数依赖
- 无数据库连接需求

### 环境变量

无需配置任何环境变量或密钥。
