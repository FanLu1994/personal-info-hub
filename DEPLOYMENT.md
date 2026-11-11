# 部署说明

## 架构概述

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  GitHub Actions │────▶│  GitHub main    │────▶│   Vercel App    │
│  定时抓取数据    │     │  data/seed/*.json │    │  读取 raw URL   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
      │                        │                        │
      │ 每日 08:00/10:30       │ commit/push            │ revalidate 5min
      │ (北京时间)              │                        │
      ▼                        ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                         用户访问网站                              │
│  Vercel 服务器自动从 GitHub raw URL 获取最新数据                   │
│  无需重新部署，无需 Deploy Hook，无需任何 secret                    │
└─────────────────────────────────────────────────────────────────┘
```

## 技术栈

- **前端**: Next.js 16 + TypeScript + Tailwind CSS 4
- **数据存储**: 静态 JSON 文件 (`data/seed/articles.json`)
- **数据获取**: GitHub Actions 定时抓取
- **托管**: Vercel (或任何支持 Next.js 的平台)

## 数据源状态

| 来源 | 配置数量 | 说明 |
|------|---------|------|
| RSS | 140 | 国内外模型厂商、科技媒体、技术博客 |
| Hacker News | 30 | 热门帖子 |
| GitHub Trending | ~25 | 每日热门仓库 |
| Linux.do | 待定 | Cloudflare 403，需登录 |

## 自动更新机制

### 无需 Deploy Hook 的架构

传统方案需要 Deploy Hook 触发 Vercel 重新部署。本项目采用不同架构：

1. **GitHub Actions** 定时运行数据抓取脚本
2. 抓取的数据 **commit 到 main 分支** 的 `data/seed/` 目录
3. **Vercel 服务器端** 通过 GitHub raw URL 读取数据
4. 使用 **Next.js revalidate** 缓存 (300秒)

这意味着：
- ✅ 无需配置任何 secret
- ✅ 无需 Deploy Hook
- ✅ 数据自动更新
- ✅ 最多 5 分钟延迟

### 为什么不用 Deploy Hook

由于 GitHub Actions 使用 `GITHUB_TOKEN` 的 push 不会触发外部 webhook：
- [GitHub 官方文档](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow) 明确说明此行为
- 这是防止递归工作流的安全设计

本项目通过服务器端读取 GitHub raw URL 绕过此限制，无需任何额外配置。

## 部署步骤

### 1. Fork 或克隆仓库到 GitHub

```bash
# 如果从 Origin 克隆
git clone https://cursor.com/git/FanLu1994/personal-info-hub
cd personal-info-hub
git remote set-url origin git@github.com:YOUR_USERNAME/personal-info-hub.git
git push -u origin main
```

### 2. 连接 Vercel

1. 访问 https://vercel.com/new
2. 导入 GitHub 仓库
3. 框架预设选择 **Next.js**
4. 点击 **Deploy**

无需配置环境变量。

### 3. 验证自动更新

1. 在 GitHub Actions 页面手动运行 "Update Data" workflow
2. 等待 workflow 完成
3. 等待 ~5 分钟让 Vercel 缓存刷新
4. 访问网站验证数据已更新

## 定时更新配置

GitHub Actions workflow 配置了以下定时任务：

```yaml
schedule:
  # 周一至周五 UTC 00:00 = 北京时间 08:00
  - cron: '0 0 * * 1-5'
  # 周一至周五 UTC 02:30 = 北京时间 10:30
  - cron: '30 2 * * 1-5'
```

可通过修改 `.github/workflows/update-data.yml` 调整更新频率。

## CI 检查

每次 PR 和 push 到 main 会运行：

1. **TypeScript 类型检查** (`npm run typecheck`)
2. **ESLint 代码检查** (`npm run lint`)
3. **Next.js 构建** (`npm run build`)
4. **数据验证** (检查 JSON 有效性和数据结构)

## 本地开发

```bash
# 安装依赖
npm install

# 开发服务器
npm run dev

# 手动运行数据抓取
npx tsx scripts/update-data.ts

# 类型检查
npm run typecheck

# 构建
npm run build
```

## 常见问题

### Q: 数据更新后网站没有变化？

A: Vercel 有 300 秒 (5分钟) 缓存。等待缓存过期后刷新页面。

### Q: 某些 RSS 源抓取失败？

A: 这是正常的。部分源可能：
- 服务器暂时不可用
- 有反爬机制
- Feed 格式变更

失败的源会在下次成功抓取时恢复。

### Q: 如何添加新的 RSS 源？

A: 编辑 `src/lib/rss-feeds.ts`，添加新的 feed：

```typescript
{ url: "https://example.com/feed.xml", category: "分类", name: "名称" },
```

### Q: 如何修改缓存时间？

A: 编辑 `src/lib/data-loader.ts` 中的 `REVALIDATE_SECONDS` 常量。

## 安全说明

- ✅ 无需任何 secret 或 token
- ✅ 仅读取固定白名单 URL (本仓库的 raw.githubusercontent.com)
- ✅ 数据验证和超时保护
- ✅ 本地 fallback 数据

## 文件结构

```
├── .github/workflows/
│   ├── ci.yml           # CI 检查
│   └── update-data.yml  # 数据自动更新
├── data/seed/
│   ├── articles.json    # 文章数据
│   └── statuses.json    # 数据源状态
├── scripts/
│   └── update-data.ts   # 数据抓取脚本
├── src/
│   ├── app/             # Next.js App Router
│   ├── components/      # React 组件
│   ├── hooks/           # 自定义 Hooks
│   └── lib/
│       ├── data-loader.ts  # 服务器端数据加载
│       ├── data-store.ts   # 数据存储层
│       ├── rss-feeds.ts    # RSS 源配置 (140个)
│       └── types.ts        # TypeScript 类型
└── DEPLOYMENT.md        # 本文档
```
