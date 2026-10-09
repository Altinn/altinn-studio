import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppDevelopmentContextProvider } from './AppDevelopmentContext';

describe('AppDevelopmentContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('should render children', () => {
    render(
      <AppDevelopmentContextProvider>
        <button>My button</button>
      </AppDevelopmentContextProvider>,
    );

    expect(screen.getByRole('button', { name: 'My button' })).toBeInTheDocument();
  });
});
