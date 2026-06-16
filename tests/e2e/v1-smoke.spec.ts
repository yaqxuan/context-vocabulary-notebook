import { expect, test } from 'playwright/test';

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
    buffer: Buffer.from('mp4'),
  });
  await page.getByLabel('上传截图').setInputFiles({
    name: 'smoke.png',
    mimeType: 'image/png',
    buffer: Buffer.from('png'),
  });
  await page.getByLabel('上传音频').setInputFiles({
    name: 'smoke.mp3',
    mimeType: 'audio/mpeg',
    buffer: Buffer.from('mp3'),
  });

  await page.getByRole('button', { name: '保存词义条目' }).click();
  await expect(page).toHaveURL(/#\/cards\//);
  await expect(page.getByRole('heading', { name: targetWord })).toBeVisible();
  await expect(page.getByText(sentence)).toBeVisible();
  await expect(page.getByRole('img', { name: /\.png$/ })).toBeVisible();

  await page.goto('/#/review');
  await expect(page.getByText(sentence)).toBeVisible();
  await page.getByRole('button', { name: 'Good' }).click();
  await expect(page.getByText('Good 已选择，请查看语境；确认无误后进入下一张。')).toBeVisible();
  await page.getByRole('button', { name: '下一张' }).click();
  await expect(page.getByText('今天没有待复习内容')).toBeVisible();

  await page.goto('/#/statistics');
  await expect(page.getByText('总词义条目数量')).toBeVisible();
  await expect(page.getByTestId('recent-14-chart')).toBeVisible();
  await expect(page.getByText('历史月份数量图')).toBeVisible();
  await expect(page.getByText('Again / Good 趋势')).toBeVisible();

  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { name: '学习与界面设置' })).toBeVisible();
  await expect(page.getByRole('button', { name: '导出含有标记的卡片' })).toBeVisible();
  await expect(page.getByRole('button', { name: '导出纯卡片' })).toBeVisible();
  await expect(page.getByLabel('选择导入 zip')).toBeVisible();
  await expect(page.getByRole('button', { name: '扫描导入文件' })).toBeVisible();
});
