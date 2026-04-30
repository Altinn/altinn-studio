import React from 'react';
import { Link, MemoryRouter, Route, Routes } from 'react-router';

import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { LoadingProvider } from 'src/core/loading/LoadingContext';
import { NavigationFocus } from 'src/features/navigation/NavigationFocus';
import { NavigationFocusStateProvider } from 'src/features/navigation/NavigationFocusStateContext';
import { NavigationState } from 'src/features/navigation/NavigationState';

function HomeRoute() {
  return (
    <>
      <Link to='/next'>Navigate with reset</Link>
      <Link
        to='/next'
        state={{ preventFocusReset: true } satisfies NavigationState}
      >
        Navigate without reset
      </Link>
    </>
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

function TestComponent({ isLoading = false }: TestComponentProps) {
  return (
    <MemoryRouter initialEntries={['/']}>
      <NavigationFocusStateProvider>
        <main
          id='main-content'
          tabIndex={-1}
        >
          <Routes>
            <Route
              path='/'
              Component={HomeRoute}
            />
            <Route
              path='/next'
              element={
                <LoadingWrapper isLoading={isLoading}>
                  <NavigationFocus />
                  <div>Next page</div>
                </LoadingWrapper>
              }
            />
          </Routes>
        </main>
      </NavigationFocusStateProvider>
    </MemoryRouter>
  );
}

describe('NavigationFocus', () => {
  it('moves focus to main-content when location key changes', async () => {
    render(<TestComponent />);

    expect(document.activeElement).not.toBe(document.getElementById('main-content'));

    await userEvent.click(screen.getByRole('link', { name: 'Navigate with reset' }));
    await screen.findByText('Next page');

    await waitFor(() => {
      expect(document.activeElement).toBe(document.getElementById('main-content'));
    });
  });

  it('does not move focus to main-content when preventFocusReset is true', async () => {
    render(<TestComponent preventFocusReset />);

    await userEvent.click(screen.getByRole('link', { name: 'Navigate without reset' }));

    await screen.findByText('Next page');

    expect(document.activeElement).not.toBe(document.getElementById('main-content'));
  });

  it('does not move focus while loading and moves focus when loading is removed', async () => {
    const { rerender } = render(<TestComponent isLoading />);

    await userEvent.click(screen.getByRole('link', { name: 'Navigate with reset' }));
    await screen.findByText('Next page');

    expect(document.activeElement).not.toBe(document.getElementById('main-content'));

    rerender(<TestComponent isLoading={false} />);

    expect(document.activeElement).toBe(document.getElementById('main-content'));
  });
});
