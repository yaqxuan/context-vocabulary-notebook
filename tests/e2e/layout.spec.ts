import { expect, test } from 'playwright/test';

test('keeps the desktop sidebar contained and scrollable on short screens', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 640 });
  await page.goto('/#/');

  const sidebar = page.locator('.app-sidebar');
  await expect(sidebar).toBeVisible();

  await expect(sidebar).toHaveCSS('overflow-y', 'auto');

  const metrics = await sidebar.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));

  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);

  await sidebar.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });

  const statsLink = page.getByRole('link', { name: /统计|Statistics/ });
  await expect(statsLink).toBeInViewport();
});

test('centers a 1440px desktop canvas and confines bubble lanes to the outer gutters', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/#/');

  const frame = page.locator('.app-frame');
  const leftLane = page.locator('.global-review-backdrop__lane--left');
  const rightLane = page.locator('.global-review-backdrop__lane--right');

  await expect(frame).toBeVisible();
  await expect(leftLane).toBeVisible();
  await expect(rightLane).toBeVisible();

  const frameBox = await frame.boundingBox();
  const leftBox = await leftLane.boundingBox();
  const rightBox = await rightLane.boundingBox();
  const layoutWidth = await page.evaluate(() => document.body.clientWidth);
  const expectedGutter = (layoutWidth - 1440) / 2;

  expect(frameBox?.x).toBeCloseTo(expectedGutter, 0);
  expect(frameBox?.width).toBeCloseTo(1440, 0);
  expect(leftBox?.x).toBe(0);
  expect(leftBox?.width).toBeCloseTo(expectedGutter, 0);
  expect(rightBox?.x).toBeCloseTo(expectedGutter + 1440, 0);
  expect(rightBox?.width).toBeCloseTo(expectedGutter, 0);

  const bubbles = page.locator('.review-bubble');
  const bubbleCount = await bubbles.count();
  for (let index = 0; index < bubbleCount; index += 1) {
    const box = await bubbles.nth(index).boundingBox();
    if (!box) continue;
    expect(box.x + box.width <= (frameBox?.x ?? 0) || box.x >= (frameBox?.x ?? 0) + (frameBox?.width ?? 0)).toBe(true);
  }

  await page.setViewportSize({ width: 1600, height: 900 });
  await expect(leftLane).toBeHidden();
  await expect(rightLane).toBeHidden();
  const compactFrameBox = await frame.boundingBox();
  const compactLayoutWidth = await page.evaluate(() => document.body.clientWidth);
  expect(compactFrameBox?.x).toBeCloseTo((compactLayoutWidth - 1440) / 2, 0);
  expect(compactFrameBox?.width).toBeCloseTo(1440, 0);
});

test('keeps create primary actions in the first screen and advanced tools below the main grid', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/#/create');

  const grid = page.locator('.card-create-grid');
  const save = page.locator('.card-create-save');
  const secondary = page.locator('.card-create-secondary-tools');

  await expect(grid).toBeVisible();
  await expect(save).toBeInViewport();

  const gridBox = await grid.boundingBox();
  const secondaryBox = await secondary.boundingBox();
  expect((secondaryBox?.y ?? 0)).toBeGreaterThanOrEqual((gridBox?.y ?? 0) + (gridBox?.height ?? 0));
});
