import { expect, test } from 'playwright/test';

function contrastRatio(foreground: string, background: string) {
  const parse = (color: string) => {
    const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
    if (!channels || channels.length !== 3) throw new Error(`Unsupported computed color: ${color}`);
    return channels.map((channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
  };
  const [redForeground, greenForeground, blueForeground] = parse(foreground);
  const [redBackground, greenBackground, blueBackground] = parse(background);
  const foregroundLuminance = 0.2126 * redForeground + 0.7152 * greenForeground + 0.0722 * blueForeground;
  const backgroundLuminance = 0.2126 * redBackground + 0.7152 * greenBackground + 0.0722 * blueBackground;
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

test('keeps native select options readable across every form route', async ({ page }) => {
  const routes = ['/#/', '/#/create', '/#/cards', '/#/batch-import', '/#/settings'];
  let checkedOptions = 0;

  for (const route of routes) {
    await page.goto(route);
    const selects = page.locator('select:visible');
    await expect.poll(() => selects.count(), { message: `${route} should expose at least one select` }).toBeGreaterThan(0);

    for (let selectIndex = 0; selectIndex < await selects.count(); selectIndex += 1) {
      const select = selects.nth(selectIndex);
      await expect(select).toHaveCSS('color-scheme', 'dark');
      const optionStyles = await select.locator('option').evaluateAll((options) => options.map((option) => {
        const style = getComputedStyle(option);
        return { color: style.color, backgroundColor: style.backgroundColor };
      }));

      for (const style of optionStyles) {
        expect(style.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(contrastRatio(style.color, style.backgroundColor)).toBeGreaterThanOrEqual(4.5);
        checkedOptions += 1;
      }
    }
  }

  expect(checkedOptions).toBeGreaterThan(20);
});

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

test('moves gutter bubbles across the lanes without allowing overlaps', async ({ page }) => {
  await page.route('**/api/review/due-bubbles*', async (route) => {
    const items = Array.from({ length: 16 }, (_, index) => ({
      id: `physics-${index}`,
      target_word: `word-${index}`,
      context_meaning: `meaning-${index}`,
      target_language: 'English',
      due_date: '2026-01-01T00:00:00.000Z',
    }));
    await route.fulfill({ json: { items, total_due_count: items.length, limit: 20, next_due_at: null } });
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/#/');
  const anchors = page.locator('.review-bubble-anchor');
  await expect(anchors).toHaveCount(16);

  const readCenters = () => anchors.evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, radius: box.width / 2 };
  }));
  const minimumSeparation = (bubbles: Array<{ x: number; y: number; radius: number }>) => {
    let minimum = Number.POSITIVE_INFINITY;
    for (let first = 0; first < bubbles.length; first += 1) {
      for (let second = first + 1; second < bubbles.length; second += 1) {
        const sameLane = (bubbles[first].x < 240) === (bubbles[second].x < 240);
        if (!sameLane) continue;
        const gap = Math.hypot(bubbles[first].x - bubbles[second].x, bubbles[first].y - bubbles[second].y)
          - bubbles[first].radius
          - bubbles[second].radius;
        minimum = Math.min(minimum, gap);
      }
    }
    return minimum;
  };

  await expect.poll(async () => minimumSeparation(await readCenters()), {
    message: 'bubble physics should resolve the initial stacked render before movement is sampled',
    timeout: 5_000,
    intervals: [50, 100, 150, 200],
  }).toBeGreaterThanOrEqual(-1);

  let previous = await readCenters();
  const travelled = previous.map(() => 0);
  let smallestObservedGap = minimumSeparation(previous);

  await expect.poll(async () => {
    const current = await readCenters();
    smallestObservedGap = Math.min(smallestObservedGap, minimumSeparation(current));
    current.forEach((bubble, index) => {
      travelled[index] += Math.hypot(bubble.x - previous[index].x, bubble.y - previous[index].y);
    });
    previous = current;
    return travelled.filter((distance) => distance > 8).length;
  }, {
    message: 'at least 12 bubbles should accumulate visible travel across repeated samples',
    timeout: 8_000,
    intervals: [150, 200, 250, 300],
  }).toBeGreaterThanOrEqual(12);

  // Continue sampling after the movement condition succeeds so collision
  // coverage is not limited to only the initial and final animation frames.
  for (let sample = 0; sample < 8; sample += 1) {
    await page.waitForTimeout(125);
    smallestObservedGap = Math.min(smallestObservedGap, minimumSeparation(await readCenters()));
  }
  expect(smallestObservedGap).toBeGreaterThanOrEqual(-1);
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

test('keeps the remaining desktop pages inside the shared centered archive layout', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });

  const routes: Array<[string, string]> = [
    ['/#/batch-import', '.batch-import-page'],
    ['/#/settings', '.phase7-settings-shell'],
    ['/#/tags', '.phase6-tags-board'],
    ['/#/statistics', '.phase7-statistics-shell'],
    ['/#/review', '.phase7-review-shell'],
  ];

  for (const [route, pageSelector] of routes) {
    await page.goto(route);
    await expect(page.locator(pageSelector)).toBeVisible();
    const frameBox = await page.locator('.app-frame').boundingBox();
    expect(frameBox?.x).toBeCloseTo(240, 0);
    expect(frameBox?.width).toBeCloseTo(1440, 0);
  }
});

test('keeps real page content free of horizontal overflow at desktop widths', async ({ page }) => {
  const routes = ['/#/', '/#/create', '/#/cards', '/#/cards/card-1', '/#/batch-import', '/#/settings', '/#/tags', '/#/favorites', '/#/statistics', '/#/review'];

  for (const width of [1600, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('.app-main')).toBeVisible();
      const dimensions = await page.locator('.app-main').evaluate((main) => ({
        clientWidth: main.clientWidth,
        scrollWidth: main.scrollWidth,
      }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    }
  }
});

test('uses one distinct decorative header illustration for each functional route', async ({ page, request }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  const routes: Array<[string, string]> = [
    ['/#/create', 'header-create-quill.webp'],
    ['/#/batch-import', 'header-batch-film.webp'],
    ['/#/cards', 'open-book.png'],
    ['/#/cards/card-1', 'header-card-detail.webp'],
    ['/#/tags', 'header-tags.webp'],
    ['/#/favorites', 'header-favorites.webp'],
    ['/#/statistics', 'header-statistics.webp'],
    ['/#/settings', 'header-settings.webp'],
  ];
  const loadedAssets = new Set<string>();

  for (const [route, expectedAsset] of routes) {
    await page.goto(route);
    const header = page.locator('.app-page-header');
    await expect(header).toBeVisible();
    const metrics = await header.evaluate((element) => {
      const headerBox = element.getBoundingClientRect();
      const titleBox = element.querySelector('h1')?.getBoundingClientRect();
      const artwork = getComputedStyle(element, '::after');
      const source = artwork.backgroundImage.match(/^url\(["']?(.*?)["']?\)$/)?.[1] ?? '';
      const artworkLeft = headerBox.right - Number.parseFloat(artwork.right) - Number.parseFloat(artwork.width);
      return {
        source,
        artworkDisplay: artwork.display,
        titleArtworkGap: titleBox ? artworkLeft - titleBox.right : -1,
      };
    });

    expect(metrics.source).toContain(expectedAsset);
    expect(metrics.artworkDisplay).not.toBe('none');
    expect(metrics.titleArtworkGap).toBeGreaterThan(0);
    expect((await request.get(metrics.source)).ok()).toBe(true);
    loadedAssets.add(metrics.source);
  }

  expect(loadedAssets.size).toBe(routes.length);
  expect([...loadedAssets].filter((source) => source.includes('open-book.png'))).toHaveLength(1);
});
