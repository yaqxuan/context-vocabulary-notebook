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

  it('layers the global review backdrop behind the app frame', () => {
    expect(topLevelRule('.app-shell')).toContain('position: relative;');
    expect(topLevelRule('.app-shell')).toContain('isolation: isolate;');
    expect(topLevelRule('.app-frame')).toContain('z-index: 2;');
    expect(topLevelRule('.global-review-backdrop')).toContain('position: fixed;');
    expect(topLevelRule('.global-review-backdrop')).toContain('height: 100vh;');
    expect(topLevelRule('.global-review-backdrop')).toContain('pointer-events: none;');
  });

  it('defines review bubble visuals, media rules, keyframes, and reduced motion', () => {
    expect(styles).toContain('.global-review-backdrop__image-panel');
    expect(styles).toContain('url("./assets/review-side-left.png")');
    expect(styles).toContain('url("./assets/review-side-right.png")');
    expect(styles).toContain('.global-review-backdrop__ambient');
    expect(styles).toContain('.global-review-backdrop__lanes');
    expect(styles).toContain('.global-review-backdrop__constellation');
    expect(styles).toContain('.global-review-backdrop__soft-ribbons');
    expect(styles).toContain('.global-review-backdrop__soft-ribbon');
    expect(styles).toContain('.global-review-backdrop__ribbon-sparks');
    expect(styles).toContain('.global-review-backdrop__decor-bubble');
    expect(styles).toContain('.global-review-backdrop__crystal-card');
    expect(styles).toContain('.global-review-backdrop__glow-orb');
    expect(styles).toContain('.global-review-backdrop__signal-ribbon');
    expect(styles).toContain('.review-bubble');
    expect(styles).toContain('.review-bubble__word');
    expect(styles).toContain('.review-bubble__shine');
    expect(styles).toContain('.review-bubble__fragments');
    expect(styles).toContain('.review-bubble--popping');
    expect(styles).toContain('@media (min-width: 1024px)');
    expect(styles).toContain('@media (max-width: 1023px)');
    expect(styles).toContain('@keyframes review-bubble-swim');
    expect(styles).toContain('@keyframes review-bubble-arrive');
    expect(styles).toContain('@keyframes review-bubble-pop');
    expect(styles).toContain('@keyframes review-bubble-fragment');
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(styles).toContain('top: var(--review-bubble-top);');
    expect(styles).toContain('width: var(--review-bubble-width);');
    expect(styles).toContain('border-radius: 0.64rem 1.08rem 0.58rem 1rem;');
    expect(styles).toContain('rotate(var(--review-bubble-tilt)) scale(var(--review-bubble-scale))');
    expect(styles).toContain('review-bubble-swim var(--review-bubble-duration) ease-in-out infinite alternate');
    expect(styles).toContain('animation-delay: var(--review-bubble-arrive-delay), var(--review-bubble-swim-delay);');
    expect(styles).toContain('left: var(--review-bubble-x);');
    expect(styles).toContain('right: var(--review-bubble-x);');
    expect(styles).toContain('.global-review-backdrop__soft-ribbons--right { right: -2.4rem; transform: scaleX(-1); animation-delay: -5s; }');
    expect(styles).toContain('@keyframes review-image-panel-float');
    expect(styles).toContain('@keyframes review-soft-ribbon-drift');
    expect(styles).toContain('@keyframes review-sparkle-float');
    expect(styles).toContain('@keyframes review-decor-bubble-float');
    expect(styles).toContain('@keyframes review-bubble-sparkle');
    expect(styles).toContain('.global-review-backdrop__constellation--right { right: 0.4rem; scale: -1 1; animation-delay: -6s; }');
    expect(styles).toContain('.global-review-backdrop__signal-ribbon--right { right: -1.4rem; scale: -1 1; animation-delay: -5s; }');
    expect(styles).not.toContain('aspect-ratio: 1;');
    expect(styles).not.toContain('(var(--review-bubble-slot) % 3)');
    expect(styles).not.toMatch(/calc\([^)]*--review-bubble[^)]*[*\/+]/);
  });
});
