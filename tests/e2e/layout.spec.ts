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

  const statsLink = page.getByRole('link', { name: /统计/ });
  await expect(statsLink).toBeInViewport();
});
