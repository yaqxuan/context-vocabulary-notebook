import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const styles = readFileSync(join(process.cwd(), 'src/client/styles.css'), 'utf8');

function topLevelRule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = styles.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  return match?.[1] ?? '';
}

describe('global app backdrop', () => {
  it('keeps the diagonal backdrop anchored to the viewport', () => {
    expect(topLevelRule('body')).toContain('background-attachment: fixed;');
  });

  it('reserves a stable scrollbar gutter so the sidebar does not shift between routes', () => {
    expect(topLevelRule('html')).toContain('scrollbar-gutter: stable;');
  });
});
