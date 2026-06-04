# Contributing Guide

感谢你愿意贡献 Context Vocabulary Notebook（语境单词本）。本项目是本地优先的语境词汇复习工具，贡献时请优先保持轻量、稳定、可长期使用。

## 贡献范围

欢迎贡献：

- Bug 修复
- 文档改进
- 测试补充
- 可访问性与可用性改进
- 与现有产品范围一致的小功能改进

提交新功能前，请先开 Issue 说明动机和方案，避免偏离项目范围。

## 本地开发环境

需要：

- Node.js 22 LTS（至少满足当前 Vite 要求的 Node 版本）
- npm
- Git
- 现代浏览器
- 可能需要 native build tools（`better-sqlite3` 无可用预编译包时会本地编译）

安装依赖并启动：

```bash
git clone https://github.com/yaqxuan/context-vocabulary-notebook.git
cd context-vocabulary-notebook
cp .env.example .env
npm ci
npm run dev
```

Windows PowerShell：

```powershell
git clone https://github.com/yaqxuan/context-vocabulary-notebook.git
Set-Location context-vocabulary-notebook
Copy-Item .env.example .env
npm ci
npm run dev
```

默认访问地址：

```text
http://localhost:5173
```

## 环境变量

<!-- AUTO-GENERATED:ENV -->
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3107` | Express backend port. Vite development server proxies `/api` to this port. |
| `DATABASE_PATH` | No | `./data/context-vocabulary-notebook.sqlite` | SQLite database path. Relative paths resolve from the project root. |
| `UPLOADS_DIR` | No | `./uploads` | Directory for uploaded local media files. Relative paths resolve from the project root. |
<!-- /AUTO-GENERATED:ENV -->

开发时如需修改前端端口，可在运行命令时设置 `CLIENT_PORT`，默认 `5173`。该变量不在 `.env.example` 中，通常不需要配置。

## 常用命令

<!-- AUTO-GENERATED:SCRIPTS -->
| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend and Vite frontend development servers together. |
| `npm run dev:client` | Start only the Vite frontend development server, listening on `0.0.0.0:5173` by default. |
| `npm run dev:server` | Start only the Express backend development server, listening on `localhost:3107` by default. |
| `npm run build` | Run type checks, then build the frontend and backend. |
| `npm test` | Run the Vitest unit and integration test suite. |
| `npm run test:e2e` | Run Playwright E2E tests; passes when no E2E tests are present. |
| `npm run typecheck` | Run TypeScript checks for frontend and Node-side code. |
| `npm run lint` | Current lint command; aliases `npm run typecheck`. |
<!-- /AUTO-GENERATED:SCRIPTS -->

## 测试要求

提交前请至少运行：

```bash
npm test
npm run typecheck
```

涉及浏览器流程、页面交互或媒体上传时，也请运行：

```bash
npm run test:e2e
```

测试原则：

- 修 Bug 时补能复现问题的测试。
- 新增行为时覆盖主要成功路径和关键失败路径。
- 不依赖本机私有数据库、私有上传文件或 API Key。
- 不把真实密钥、真实用户数据、个人媒体文件提交到仓库。

## 代码风格

- 使用 TypeScript 严格类型。
- 保持代码风格与周围文件一致。
- 优先小改动，避免无关重构。
- 不提交生成的本地数据目录：`data/`、`uploads/`、`dist/`、`node_modules/`。
- AI API Key 等敏感配置只应保存在本地 `.env` 或本地数据库中，不应进入导出文件或提交记录。

## Pull Request 清单

提交 PR 前请确认：

- [ ] 变更符合项目定位和 README 描述。
- [ ] 已运行 `npm test`。
- [ ] 已运行 `npm run typecheck`。
- [ ] 如涉及浏览器流程，已运行 `npm run test:e2e`。
- [ ] 文档已同步更新。
- [ ] 没有提交 `.env`、数据库、上传文件、API Key 或其他敏感信息。
- [ ] PR 描述说明了变更内容、测试方式和潜在影响。

## 安全问题

如果你发现安全漏洞，请不要创建公开 Issue。请按 [`SECURITY.md`](./SECURITY.md) 中的方式报告。
