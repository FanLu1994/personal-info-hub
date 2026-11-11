# 部署说明

## 当前状态

### 本地开发
- ✅ 开发服务器运行正常 (端口 4173)
- ✅ 数据获取正常 (RSS/HN/GitHub)
- ⚠️ Linux.do 返回 HTTP 403 (Cloudflare 防护，预期行为)

### 数据源状态
| 来源 | 状态 | 说明 |
|------|------|------|
| RSS | ✅ 正常 | 1700+ 文章已获取，15 源失败 (预期) |
| Hacker News | ✅ 正常 | 30 热门帖子 |
| GitHub Trending | ✅ 正常 | 12 热门仓库 |
| Linux.do | ❌ 被阻止 | Cloudflare 403，需服务器端解决方案 |

## 部署阻断因素

### 1. Vercel 部署
**状态**: 需要用户操作

**阻断因素**:
- Vercel MCP 需要认证 (`needsAuth` 状态)
- 当前仓库在 Origin (cursor.com/git/...)，非 GitHub
- Vercel 不直接支持 Origin 仓库连接

**解决方案选项**:
1. **用户在 Cursor Dashboard 中认证 Vercel MCP** - 然后可使用 MCP 工具部署
2. **手动部署** - 用户克隆到 GitHub 并连接 Vercel
3. **其他平台** - Railway, Fly.io 等支持直接 git 部署

### 2. SQLite 生产兼容性
**问题**: SQLite 在无服务器环境 (Vercel Functions) 中不持久

**解决方案**:
- **Vercel**: 使用 Vercel KV, Turso (LibSQL), 或 Neon Postgres
- **传统服务器**: VPS/容器部署，SQLite 可直接使用
- **推荐**: 对于当前数据量，Turso 或 Vercel KV 免费层足够

### 3. 定时更新
**当前状态**: ❌ 未自动实现，仅文档记录

**实现方式**:
- **Vercel Cron**: `vercel.json` 配置 cron 任务
- **GitHub Actions**: 定时触发 `/api/refresh`
- **外部服务**: cron-job.org, EasyCron 等

## 安全评估

### 刷新端点保护
✅ **已实现**: 速率限制 (每分钟 3 次请求)
- IP 基础限制
- 429 响应包含 Retry-After
- X-RateLimit-* 头信息

### SSRF 防护
✅ **已实现**: 
- 白名单域名验证
- 协议限制 (仅 HTTP/HTTPS)
- 私有 IP 检测
- 重定向验证

## 外部可访问 URL

**当前**: ❌ 无公网 URL

此 Cloud Agent 环境不提供公开可访问的 URL。`http://127.0.0.1:4173` 仅在此 VM 内部可访问。

**获取公网 URL 的方式**:
1. 部署到 Vercel/Netlify/Railway
2. 使用用户自己的服务器部署

## 部署步骤 (用户操作)

### 选项 A: Vercel 部署 (推荐)

1. **创建 GitHub 仓库**
   ```bash
   # 在本地机器上
   git clone <origin-repo-url> info-digest
   cd info-digest
   git remote add github git@github.com:YOUR_USERNAME/info-digest.git
   git push github main
   ```

2. **连接 Vercel**
   - 访问 https://vercel.com/new
   - 导入 GitHub 仓库
   - 框架预设选择 Next.js

3. **配置持久化存储**
   - 添加 Vercel KV 或 Turso 数据库
   - 更新数据库连接代码

4. **配置定时任务**
   ```json
   // vercel.json
   {
     "crons": [
       { "path": "/api/refresh?source=rss", "schedule": "0 0 * * 1-5" },
       { "path": "/api/refresh?source=all", "schedule": "30 2 * * 1-5" }
     ]
   }
   ```

### 选项 B: 传统服务器部署

1. 在 VPS 上克隆仓库
2. `npm install && npm run build`
3. 使用 PM2 或 systemd 运行 `npm start`
4. 配置 nginx 反向代理
5. 设置 cron 任务调用刷新 API

## 自动更新状态

| 功能 | 状态 | 说明 |
|------|------|------|
| 手动刷新 | ✅ 已实现 | 前端按钮 + API |
| 定时更新 | ❌ 待配置 | 需部署后配置 cron |
| 聊天同步 | ❌ 未实现 | 无现有集成接口 |

## 环境变量

生产部署需配置:
```env
DATA_DIR=/data  # 数据目录路径
NODE_ENV=production
```
