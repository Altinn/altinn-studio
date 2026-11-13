import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { PlatformOutletContext } from 'admin/features/platform/layout/PlatformLayout';

export const defaultPlatformContext: PlatformOutletContext = {
  environment: 'production',
  periodDays: 30,
};

/** Renders a platform page below a route that provides the layout's outlet context. */
export const renderPlatformPage = (
  page: ReactElement,
  queryClient: QueryClient = createQueryClientMock(),
  context: PlatformOutletContext = defaultPlatformContext,
) =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route element={<Outlet context={context} />}>
            <Route path='/' element={page} />
          </Route>
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
