import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '../../src/client/App';

describe('App', () => {
  it('renders the project shell with navigation placeholders', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Context Vocabulary Notebook' })).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toHaveTextContent('首页');
    expect(screen.getByRole('navigation')).toHaveTextContent('制卡');
    expect(screen.getByRole('navigation')).toHaveTextContent('复习');
  });
});
