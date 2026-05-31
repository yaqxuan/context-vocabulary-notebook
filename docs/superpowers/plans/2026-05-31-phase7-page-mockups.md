# Phase 7 Page Mockups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create independent HTML visual drafts for Phase 7 review, statistics, and settings/import-export pages before React implementation.

**Architecture:** Produce three static, self-contained HTML files under `docs/superpowers/mockups/` so the user can open and review each page independently. Each draft mirrors V1 requirements from `require.md` while staying clearly non-functional and scoped to visual/interaction direction only.

**Tech Stack:** Static HTML + inline CSS; no JavaScript dependencies; existing project mockup folder conventions.

---

## File Structure

- Create: `docs/superpowers/mockups/phase7-review-page-mockup.html`
  - Shows FSRS review flow, primary sentence, highlighted target word, answer reveal, context expansion, Again/Good actions, daily-goal state, and zero-task state.
- Create: `docs/superpowers/mockups/phase7-statistics-page-mockup.html`
  - Shows total/reviewing/mastered/favorite metrics, daily review trend, daily accuracy trend, tag distribution, and Again/Good trend.
- Create: `docs/superpowers/mockups/phase7-settings-page-mockup.html`
  - Shows language/default-language/daily-limit settings plus marked export, pure-card export, import scan conflicts, and execute-import decision controls.

---

### Task 1: Review Page Mockup

**Files:**
- Create: `docs/superpowers/mockups/phase7-review-page-mockup.html`

- [ ] **Step 1: Draft page structure**

Create self-contained HTML with:

```html
<title>Phase 7 复习页视觉草稿</title>
<aside>navigation with 复习 active</aside>
<main>
  <section>hero with due count and daily progress</section>
  <section>review card with full primary sentence and highlighted target word</section>
  <section>context reveal panel with video/screenshot/audio/notes/other contexts</section>
  <section>answer + Again / Good actions</section>
  <section>daily goal complete state</section>
  <section>zero due state</section>
</main>
```

- [ ] **Step 2: Align with requirements**

Confirm visible text covers:

```text
完整显示主语境原句，目标单词不遮住
查看当时语境
本地视频 / 截图 / 音频 / 备注 / 其他语境实例
Again / Good
今天没有待复习内容
返回首页 / 查看全部词义条目
今日复习目标已完成
结束复习 / 继续复习
```

- [ ] **Step 3: Verify in browser**

Run:

```bash
node --input-type=module <<'JS'
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
await page.goto('file:///home/aq/projects/vocabulary-notebook/docs/superpowers/mockups/phase7-review-page-mockup.html');
console.log(await page.title());
console.log((await page.locator('body').innerText()).includes('Again'));
await page.screenshot({ path: '/tmp/phase7-review-page-mockup.png', fullPage: true });
await browser.close();
JS
```

Expected: title prints `Phase 7 复习页视觉草稿`, boolean prints `true`, screenshot exists.

---

### Task 2: Statistics Page Mockup

**Files:**
- Create: `docs/superpowers/mockups/phase7-statistics-page-mockup.html`

- [ ] **Step 1: Draft page structure**

Create self-contained HTML with:

```html
<title>Phase 7 统计页视觉草稿</title>
<aside>navigation with 统计 active</aside>
<main>
  <section>hero with analysis summary</section>
  <section>four metric cards: total, reviewing, mastered, favorites</section>
  <section>daily review quantity line/bar chart</section>
  <section>daily accuracy chart</section>
  <section>tag distribution</section>
  <section>Again / Good trend</section>
</main>
```

- [ ] **Step 2: Align with requirements**

Confirm visible text covers:

```text
总词义条目数量
复习中数量
已熟记数量
收藏数量
每日复习数量折线图
每日正确率折线图
标签分布
Again / Good 趋势
```

- [ ] **Step 3: Verify in browser**

Run:

```bash
node --input-type=module <<'JS'
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
await page.goto('file:///home/aq/projects/vocabulary-notebook/docs/superpowers/mockups/phase7-statistics-page-mockup.html');
console.log(await page.title());
console.log((await page.locator('body').innerText()).includes('标签分布'));
await page.screenshot({ path: '/tmp/phase7-statistics-page-mockup.png', fullPage: true });
await browser.close();
JS
```

Expected: title prints `Phase 7 统计页视觉草稿`, boolean prints `true`, screenshot exists.

---

### Task 3: Settings / Import-Export Page Mockup

**Files:**
- Create: `docs/superpowers/mockups/phase7-settings-page-mockup.html`

- [ ] **Step 1: Draft page structure**

Create self-contained HTML with:

```html
<title>Phase 7 设置页视觉草稿</title>
<aside>navigation with 设置 active</aside>
<main>
  <section>hero with local-first settings summary</section>
  <section>settings form: UI language, default learning language, default meaning language, daily review limit</section>
  <section>export cards: marked backup and pure-card share</section>
  <section>import scan upload and conflict summary</section>
  <section>bulk conflict decision controls</section>
</main>
```

- [ ] **Step 2: Align with requirements**

Confirm visible text covers:

```text
界面语言
默认学习语言
默认释义语言
每日复习数量
数据导入导出
导出含有标记的卡片
导出纯卡片
全部跳过
全部合并为已有词义条目的新语境
全部作为新词义条目导入
逐项处理
```

Confirm page does not show:

```text
本地 API
CLI
AI
同步
```

- [ ] **Step 3: Verify in browser**

Run:

```bash
node --input-type=module <<'JS'
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
await page.goto('file:///home/aq/projects/vocabulary-notebook/docs/superpowers/mockups/phase7-settings-page-mockup.html');
const text = await page.locator('body').innerText();
console.log(await page.title());
console.log(text.includes('数据导入导出'));
console.log(['本地 API','CLI','AI','同步'].some((term) => text.includes(term)));
await page.screenshot({ path: '/tmp/phase7-settings-page-mockup.png', fullPage: true });
await browser.close();
JS
```

Expected: title prints `Phase 7 设置页视觉草稿`, first boolean prints `true`, second boolean prints `false`, screenshot exists.

---

### Task 4: Review and Commit

**Files:**
- Verify: all three mockup files.

- [ ] **Step 1: Check git diff**

Run:

```bash
git diff --stat
git diff -- docs/superpowers/mockups/phase7-review-page-mockup.html docs/superpowers/mockups/phase7-statistics-page-mockup.html docs/superpowers/mockups/phase7-settings-page-mockup.html
```

Expected: only the three mockup files are created.

- [ ] **Step 2: Commit if user accepts drafts**

Do not commit before user reviews drafts. If accepted, run:

```bash
git add docs/superpowers/mockups/phase7-review-page-mockup.html docs/superpowers/mockups/phase7-statistics-page-mockup.html docs/superpowers/mockups/phase7-settings-page-mockup.html docs/superpowers/plans/2026-05-31-phase7-page-mockups.md
git commit -m "docs: draft phase 7 page mockups"
```
