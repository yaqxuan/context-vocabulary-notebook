import { expect, test } from 'playwright/test';

import { TINY_MP3_BASE64, TINY_MP4_BASE64, TINY_PNG_BASE64 } from '../fixtures/tinyMp4';

test('creates a card with media, reviews it, and shows statistics/settings', async ({ page }) => {
  const suffix = Date.now().toString(36);
  const targetWord = `smoke-${suffix}`;
  const meaning = `冒烟测试-${suffix}`;
  const sentence = `This ${targetWord} confirms the V1 browser smoke path.`;

  await expect.poll(async () => {
    const response = await page.request.get('/api/health');
    return response.ok();
  }).toBe(true);

  await page.goto('/#/');
  const interfaceLanguageSelect = page.locator('#home-interface-language-select');
  if ((await interfaceLanguageSelect.inputValue()) !== '中文') {
    await Promise.all([
      page.waitForResponse(response => response.url().includes('/api/settings') && response.request().method() === 'PATCH'),
      interfaceLanguageSelect.selectOption('中文'),
    ]);
  }

  await page.goto('/#/create');
  await expect(page.getByRole('button', { name: '保存词义条目' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '捕捉一个真实语境' })).toHaveCount(0);

  await page.getByLabel('目标单词').fill(targetWord);
  await page.getByLabel('当前语境释义').fill(meaning);
  await page.getByLabel('原句').fill(sentence);
  await page.getByLabel('AI 建议').fill('Playwright V1 smoke note');
  await page.getByLabel('上传本地视频').setInputFiles({
    name: 'smoke.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.from(TINY_MP4_BASE64, 'base64'),
  });
  await page.getByLabel('上传截图').setInputFiles({
    name: 'smoke.png',
    mimeType: 'image/png',
    buffer: Buffer.from(TINY_PNG_BASE64, 'base64'),
  });
  await page.getByLabel('上传音频').setInputFiles({
    name: 'smoke.mp3',
    mimeType: 'audio/mpeg',
    buffer: Buffer.from(TINY_MP3_BASE64, 'base64'),
  });

  await page.getByRole('button', { name: '保存词义条目' }).click();
  await expect(page).toHaveURL(/#\/cards\//);
  await expect(page.getByRole('heading', { name: targetWord })).toBeVisible();
  await expect(page.getByText(sentence)).toBeVisible();
  await expect(page.getByRole('img', { name: /\.png$/ })).toBeVisible();

  const detailVideo = page.locator('.vn-media-preview__video');
  await expect(detailVideo).toBeVisible();
  const videoSrc = await detailVideo.getAttribute('src');
  expect(videoSrc).toMatch(/^\/uploads\//);
  const mediaResponse = await page.request.get(videoSrc!, { headers: { Range: 'bytes=0-31' } });
  expect(mediaResponse.status()).toBe(206);
  expect(mediaResponse.headers()['content-type']).toContain('video/mp4');
  expect(mediaResponse.headers()['accept-ranges']).toBe('bytes');
  await expect.poll(() => detailVideo.evaluate((video: HTMLVideoElement) => ({
    duration: video.duration,
    hasMetadata: video.readyState >= 1,
    height: video.videoHeight,
    width: video.videoWidth,
  }))).toMatchObject({ width: 160, height: 90, hasMetadata: true });
  const videoBox = await detailVideo.boundingBox();
  expect((videoBox?.width ?? 0) / (videoBox?.height ?? 1)).toBeCloseTo(16 / 9, 1);
  await detailVideo.evaluate(async (video: HTMLVideoElement) => {
    video.muted = true;
    await video.play();
  });
  await expect.poll(() => detailVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(false);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/review');
  await expect(page.getByText(sentence)).toBeVisible();
  await page.getByRole('button', { name: 'Good' }).click();
  await expect(page.getByText('Good 已选择，请查看语境；确认无误后进入下一张。')).toBeVisible();
  const reviewVideo = page.locator('.phase7-review-media-player--video');
  await expect(reviewVideo).toBeVisible();
  await expect.poll(() => reviewVideo.evaluate((video: HTMLVideoElement) => ({
    hasMetadata: video.readyState >= 1,
    height: video.videoHeight,
    width: video.videoWidth,
  }))).toMatchObject({ width: 160, height: 90, hasMetadata: true });
  const reviewVideoBox = await reviewVideo.boundingBox();
  expect((reviewVideoBox?.width ?? 0) / (reviewVideoBox?.height ?? 1)).toBeCloseTo(16 / 9, 1);
  expect((reviewVideoBox?.y ?? 0) + (reviewVideoBox?.height ?? 0)).toBeLessThanOrEqual(900);
  const reviewCardBox = await page.locator('.phase7-review-card--with-visual-media').boundingBox();
  expect((reviewCardBox?.y ?? 0) + (reviewCardBox?.height ?? 0)).toBeLessThanOrEqual(900);
  const sentenceBox = await page.locator('.phase7-review-sentence-block').boundingBox();
  const contextBox = await page.locator('.phase7-review-context-panel').boundingBox();
  expect(contextBox?.x).toBeGreaterThan((sentenceBox?.x ?? 0) + (sentenceBox?.width ?? 0) - 2);
  const ratingBox = await page.locator('.phase7-review-rating-row').boundingBox();
  expect((ratingBox?.y ?? 0) + (ratingBox?.height ?? 0)).toBeLessThanOrEqual(900);
  await page.getByRole('button', { name: '下一张' }).click();
  await expect(page.getByText('今天没有待复习内容')).toBeVisible();

  await page.goto('/#/statistics');
  await expect(page.getByText('总词义条目数量')).toBeVisible();
  await expect(page.getByTestId('recent-14-chart')).toBeVisible();
  await expect(page.getByText('历史月份数量图')).toBeVisible();
  await expect(page.getByText('Again / Good 趋势')).toBeVisible();
  const chartCards = page.locator('.phase7-statistics-chart-card');
  await expect(chartCards).toHaveCount(5);
  const chartGeometry = await chartCards.evaluateAll((cards) => cards.map((card) => ({
    clientHeight: card.clientHeight,
    clientWidth: card.clientWidth,
    scrollHeight: card.scrollHeight,
  })));
  for (const chart of chartGeometry) {
    expect(chart.clientWidth).toBeGreaterThan(250);
    expect(chart.clientHeight).toBeGreaterThan(200);
    expect(chart.scrollHeight).toBeLessThanOrEqual(chart.clientHeight + 2);
  }
  const trendCardBox = await chartCards.last().boundingBox();
  const trendGroupsBox = await page.locator('.phase7-statistics-rating-groups').boundingBox();
  expect(trendCardBox?.width).toBeGreaterThan(900);
  expect((trendGroupsBox?.y ?? 0) + (trendGroupsBox?.height ?? 0)).toBeLessThanOrEqual((trendCardBox?.y ?? 0) + (trendCardBox?.height ?? 0) + 1);

  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { name: '学习与界面设置' })).toBeVisible();
  await expect(page.getByRole('button', { name: '导出含有标记的卡片' })).toBeVisible();
  await expect(page.getByRole('button', { name: '导出纯卡片' })).toBeVisible();
  await expect(page.getByLabel('选择导入 zip')).toBeVisible();
  await expect(page.getByRole('button', { name: '扫描导入文件' })).toBeVisible();
});
