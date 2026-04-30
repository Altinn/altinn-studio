import React from 'react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';

import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { LoadingProvider } from 'src/core/loading/LoadingContext';
import { NavigationFocus } from 'src/features/navigation/NavigationFocus';
import { NavigationFocusStateProvider } from 'src/features/navigation/NavigationFocusStateContext';

function TriggerNavigation({ preventFocusReset = false }: { preventFocusReset?: boolean }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => {
        navigate('/next', preventFocusReset ? { state: { preventFocusReset: true } } : undefined);
      }}
    >
      Navigate
    </button>
  );
}

interface TestComponentProps {
  preventFocusReset?: boolean;
  isLoading?: boolean;
}

function LoadingWrapper({ isLoading, children }: React.PropsWithChildren<{ isLoading: boolean }>) {
  if (!isLoading) {
    return children;
  }

  return <LoadingProvider reason='loading'>{children}</LoadingProvider>;
}

function TestComponent({ preventFocusReset = false, isLoading = false }: TestComponentProps) {
  return (
    <MemoryRouter initialEntries={['/']}>
      <NavigationFocusStateProvider>
        <>
          <LoadingWrapper isLoading={isLoading}>
            <NavigationFocus />
          </LoadingWrapper>
          <main
            id='main-content'
            tabIndex={-1}
          />
          <Routes>
            <Route
              path='/'
              element={<TriggerNavigation preventFocusReset={preventFocusReset} />}
            />
            <Route
              path='/next'
              element={<div>Next page</div>}
            />
          </Routes>
        </>
      </NavigationFocusStateProvider>
    </MemoryRouter>
  );
}

describe('NavigationFocus', () => {
  it('moves focus to main-content when location key changes', async () => {
    render(<TestComponent />);

    expect(document.activeElement).not.toBe(document.getElementById('main-content'));

    await userEvent.click(screen.getByRole('button', { name: 'Navigate' }));
    await screen.findByText('Next page');

    await waitFor(() => {
      expect(document.activeElement).toBe(document.getElementById('main-content'));
    });
  });

  it('does not move focus to main-content when preventFocusReset is true', async () => {
    render(<TestComponent preventFocusReset />);

    const mainContent = document.getElementById('main-content');

    await userEvent.click(screen.getByRole('button', { name: 'Navigate' }));

    await screen.findByText('Next page');

    expect(document.activeElement).not.toBe(mainContent);
  });

  it('does not move focus while loading and moves focus when loading is removed', async () => {
    const { rerender } = render(<TestComponent isLoading />);
    const mainContent = document.getElementById('main-content');

    await userEvent.click(screen.getByRole('button', { name: 'Navigate' }));
    await screen.findByText('Next page');

    expect(document.activeElement).not.toBe(mainContent);

    rerender(<TestComponent isLoading={false} />);

    await waitFor(() => {
      expect(document.activeElement).toBe(mainContent);
    });
  });
});
