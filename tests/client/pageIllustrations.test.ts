import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const assetDirectory = join(process.cwd(), 'src/client/assets/crystal-archive');
const approvedLayout = readFileSync(join(process.cwd(), 'src/client/approved-layout.css'), 'utf8');

const routeIllustrations = [
  { selector: '.app-shell[data-route="/cards"]', asset: 'open-book.png' },
  { selector: '.app-shell[data-route="/create"]', asset: 'header-create-quill.webp' },
  { selector: '.app-shell[data-route="/batch-import"]', asset: 'header-batch-film.webp' },
  { selector: '.app-shell[data-route^="/cards/"]', asset: 'header-card-detail.webp' },
  { selector: '.app-shell[data-route="/tags"]', asset: 'header-tags.webp' },
  { selector: '.app-shell[data-route="/favorites"]', asset: 'header-favorites.webp' },
  { selector: '.app-shell[data-route="/statistics"]', asset: 'header-statistics.webp' },
  { selector: '.app-shell[data-route="/settings"]', asset: 'header-settings.webp' },
] as const;

describe('page-specific header illustrations', () => {
  it('maps every standard desktop header route to one distinct asset', () => {
    expect(approvedLayout).toContain('background-image: var(--page-header-art, none) !important;');

    for (const { selector, asset } of routeIllustrations) {
      expect(approvedLayout).toContain(selector);
      expect(approvedLayout).toContain(`--page-header-art: url('./assets/crystal-archive/${asset}');`);
    }

    const assets = routeIllustrations.map(({ asset }) => asset);
    expect(new Set(assets).size).toBe(assets.length);
    expect(assets.filter((asset) => asset === 'open-book.png')).toHaveLength(1);
    expect(approvedLayout.match(/open-book\.png/g)).toHaveLength(1);
  });

  it('ships unique, compact WebP files for the seven generated illustrations', () => {
    const generatedAssets = routeIllustrations
      .map(({ asset }) => asset)
      .filter((asset) => asset.endsWith('.webp'));
    const hashes = generatedAssets.map((asset) => {
      const path = join(assetDirectory, asset);
      expect(existsSync(path), `${asset} should exist`).toBe(true);
      expect(statSync(path).size, `${asset} should remain below 200 KB`).toBeLessThan(200_000);

      const contents = readFileSync(path);
      expect(contents.subarray(0, 4).toString('ascii')).toBe('RIFF');
      expect(contents.subarray(8, 12).toString('ascii')).toBe('WEBP');
      return createHash('sha256').update(contents).digest('hex');
    });

    expect(new Set(hashes).size).toBe(generatedAssets.length);
  });

  it('keeps unknown routes free of the old generic book fallback', () => {
    expect(approvedLayout).not.toContain("background: url('./assets/crystal-archive/open-book.png')");
    expect(approvedLayout).toContain('var(--page-header-art, none)');
  });
});
