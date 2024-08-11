import type { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { render, renderHook } from '@testing-library/react';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';

export type SharedExtendedRenderOptions = /*Omit<RenderOptions, 'wrapper' | 'queries'> &*/ {
  queries?: Partial<ServicesContextProps>;
  queryClient?: QueryClient;
  basename?: string;
  startUrl?: string;
};

// export type SharedProvidersArgs = SharedExtendedRenderOptions & { children: ReactNode };

export const SharedProviders = ({
  queries = {},
  queryClient = createQueryClientMock(),
  basename = undefined,
  startUrl = undefined,
  children,
}: SharedExtendedRenderOptions & { children: ReactNode }) => {
  return (
    <ServicesContextProvider {...queriesMock} {...queries} client={queryClient}>
      <MemoryRouter
        basename={APP_DEVELOPMENT_BASENAME}
        initialEntries={startUrl ? [startUrl] : undefined}
      >
        <Routes>
          <Route path='/:org/:app/*' element={children} />
        </Routes>
      </MemoryRouter>
    </ServicesContextProvider>
  );
};

export const renderWithProviders = (
  component: ReactNode,
  { queries, queryClient, basename, startUrl, ...renderOptions }: SharedExtendedRenderOptions = {},
) => {
  return render(component, {
    wrapper: ({ children }) => (
      <SharedProviders
        queries={queries}
        queryClient={queryClient}
        basename={basename}
        startUrl={startUrl}
      >
        {children}
      </SharedProviders>
    ),
    ...renderOptions,
  });
};

export const renderHookWithProviders = (
  hook: any,
  { queries, queryClient, basename, startUrl, ...renderOptions }: SharedExtendedRenderOptions = {},
) => {
  return renderHook(hook, {
    wrapper: ({ children }) => (
      <SharedProviders
        queries={queries}
        queryClient={queryClient}
        basename={basename}
        startUrl={startUrl}
      >
        {children}
      </SharedProviders>
    ),
    ...renderOptions,
  });
};

// export * from '@testing-library/react';

// export { renderWithProviders as render };
