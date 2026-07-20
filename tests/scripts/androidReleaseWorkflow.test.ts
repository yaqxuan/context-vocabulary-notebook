import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const workflow = readFileSync(
  path.join(process.cwd(), '.github/workflows/android.yml'),
  'utf8',
);

describe('Android release workflow', () => {
  it('marks alpha, beta, and release-candidate tags as prereleases', () => {
    expect(workflow).toContain('*-alpha*|*-beta*|*-rc*)');
    expect(workflow).toContain('release_flags+=(--prerelease)');
    expect(workflow).toContain('"${release_flags[@]}"');
  });
});
