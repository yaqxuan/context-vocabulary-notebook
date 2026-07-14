import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const demoDir = path.dirname(fileURLToPath(import.meta.url));
const baseURL = process.env.DEMO_BASE_URL ?? 'http://127.0.0.1:5190';

const locales = [
  { suffix: 'en', interfaceLanguage: '英语', definitionLanguage: '英语', meaning: 'able to recover quickly' },
  { suffix: 'zh', interfaceLanguage: '中文', definitionLanguage: '中文', meaning: '有韧性的，能迅速恢复的' },
  { suffix: 'ja', interfaceLanguage: '日语', definitionLanguage: '日语', meaning: '回復力のある' },
  { suffix: 'es', interfaceLanguage: '西班牙语', definitionLanguage: '西班牙语', meaning: 'capaz de recuperarse rápidamente' },
  { suffix: 'de', interfaceLanguage: '德语', definitionLanguage: '德语', meaning: 'widerstandsfähig' },
  { suffix: 'fr', interfaceLanguage: '法语', definitionLanguage: '法语', meaning: 'capable de se rétablir rapidement' },
  { suffix: 'ko', interfaceLanguage: '韩语', definitionLanguage: '韩语', meaning: '회복력이 강한' },
  { suffix: 'ru', interfaceLanguage: '俄语', definitionLanguage: '俄语', meaning: 'быстро восстанавливающийся' },
];

const statisticsFixture = {
  totals: { total_cards: 24, reviewing_cards: 17, mastered_cards: 7, favorite_cards: 6 },
  daily_review_counts: [
    { date: '2026-07-01', count: 8 },
    { date: '2026-07-02', count: 12 },
    { date: '2026-07-03', count: 7 },
    { date: '2026-07-04', count: 15 },
    { date: '2026-07-05', count: 10 },
    { date: '2026-07-06', count: 18 },
    { date: '2026-07-07', count: 14 },
    { date: '2026-07-08', count: 11 },
  ],
  daily_accuracy: [
    { date: '2026-07-01', reviewed_count: 8, good_count: 5, accuracy: 0.625 },
    { date: '2026-07-02', reviewed_count: 12, good_count: 9, accuracy: 0.75 },
    { date: '2026-07-03', reviewed_count: 7, good_count: 5, accuracy: 0.714 },
    { date: '2026-07-04', reviewed_count: 15, good_count: 12, accuracy: 0.8 },
    { date: '2026-07-05', reviewed_count: 10, good_count: 8, accuracy: 0.8 },
    { date: '2026-07-06', reviewed_count: 18, good_count: 15, accuracy: 0.833 },
    { date: '2026-07-07', reviewed_count: 14, good_count: 12, accuracy: 0.857 },
    { date: '2026-07-08', reviewed_count: 11, good_count: 10, accuracy: 0.909 },
  ],
  monthly_review_counts: [
    { month: '2026-05', count: 78 },
    { month: '2026-06', count: 116 },
    { month: '2026-07', count: 95 },
  ],
  tag_distribution: [
    { tag_id: 'tag-daily', name: 'Daily life', card_count: 10 },
    { tag_id: 'tag-film', name: 'Film', card_count: 7 },
    { tag_id: 'tag-work', name: 'Work', card_count: 5 },
    { tag_id: 'tag-reading', name: 'Reading', card_count: 4 },
  ],
  rating_trend: [
    { date: '2026-07-01', again_count: 3, good_count: 5 },
    { date: '2026-07-02', again_count: 3, good_count: 9 },
    { date: '2026-07-03', again_count: 2, good_count: 5 },
    { date: '2026-07-04', again_count: 3, good_count: 12 },
    { date: '2026-07-05', again_count: 2, good_count: 8 },
    { date: '2026-07-06', again_count: 3, good_count: 15 },
    { date: '2026-07-07', again_count: 2, good_count: 12 },
    { date: '2026-07-08', again_count: 1, good_count: 10 },
  ],
};

function assertOk(response, label) {
  if (!response.ok()) {
    throw new Error(`${label} failed: ${response.status()} ${response.statusText()}`);
  }
  return response;
}

async function patchSettings(request, interfaceLanguage, definitionLanguage = interfaceLanguage) {
  assertOk(await request.patch('/api/settings', {
    data: {
      interface_language: interfaceLanguage,
      default_target_language: '英语',
      default_definition_language: definitionLanguage,
      daily_review_limit: 20,
    },
  }), `settings (${interfaceLanguage})`);
}

async function prepareFixture(request) {
  const tags = [];
  for (const name of ['Film', 'Daily life', 'Memorable scenes']) {
    const response = assertOk(await request.post('/api/tags', { data: { name } }), `tag ${name}`);
    tags.push(await response.json());
  }

  const response = assertOk(await request.post('/api/cards', {
    data: {
      target_word: 'serendipity',
      context_meaning: 'an unexpected fortunate discovery',
      target_language: '英语',
      definition_language: '英语',
      sentence: 'A small moment of serendipity changed the way I remembered the word.',
      note: 'The discovery happened by chance and led to a useful new connection.',
      tag_ids: tags.slice(0, 2).map((tag) => tag.id),
    },
  }), 'demo card');
  return response.json();
}

async function readyPage(page, selector) {
  await page.locator(selector).waitFor({ state: 'visible' });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content: `
      * { caret-color: transparent !important; }
      html { scrollbar-width: none !important; }
      html::-webkit-scrollbar, body::-webkit-scrollbar { display: none !important; }
    `,
  });
  await page.waitForTimeout(650);
}

async function capture(page, fileName) {
  await page.screenshot({
    path: path.join(demoDir, fileName),
    animations: 'disabled',
    fullPage: false,
  });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  baseURL,
  viewport: { width: 1600, height: 900 },
  colorScheme: 'dark',
  reducedMotion: 'reduce',
});
const page = await context.newPage();

try {
  assertOk(await page.request.get('/api/health'), 'health check');
  const { card } = await prepareFixture(page.request);

  for (const locale of locales) {
    await patchSettings(page.request, locale.interfaceLanguage, locale.definitionLanguage);
    await page.goto(`/?demo=${locale.suffix}#/create`);
    await readyPage(page, '#cc-sentence');
    await page.locator('#cc-sentence').fill('The small team remained resilient through every unexpected challenge.');
    await page.locator('#cc-target-word').fill('resilient');
    await page.locator('#cc-meaning').fill(locale.meaning);
    await page.locator('input[type="file"]').nth(0).setInputFiles({
      name: 'resilient-scene.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('demo-video-placeholder'),
    });
    await page.locator('input[type="file"]').nth(1).setInputFiles({
      name: 'scene-note.png',
      mimeType: 'image/png',
      buffer: Buffer.from('demo-image-placeholder'),
    });
    await page.waitForTimeout(850);
    await capture(page, `01-create-card-${locale.suffix}.png`);
  }

  await patchSettings(page.request, '英语', '英语');
  await page.goto(`/?demo=detail#/cards/${card.id}`);
  await readyPage(page, '.phase6-detail');
  await capture(page, '02-context-card.png');

  await page.goto('/?demo=review#/review');
  await readyPage(page, '.phase7-review-card');
  await page.getByRole('button', { name: 'Good' }).click();
  await page.locator('.phase7-review-meaning').waitFor({ state: 'visible' });
  await page.waitForTimeout(350);
  await capture(page, '03-review.png');

  await page.route('**/api/statistics', async (route) => {
    await route.fulfill({ json: statisticsFixture });
  });
  await page.goto('/?demo=statistics#/statistics');
  await readyPage(page, '.phase7-statistics-shell');
  await capture(page, '04-statistics.png');
} finally {
  await context.close();
  await browser.close();
}
