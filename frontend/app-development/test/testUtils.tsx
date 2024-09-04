import React from 'react';
import type { RenderOptions } from '@testing-library/react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queryClientConfigMock } from 'app-shared/mocks/queryClientMock';
import type { QueryClient } from '@tanstack/react-query';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { AppDevelopmentContextProvider } from '../contexts/AppDevelopmentContext';

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  startUrl?: string;
  queries?: Partial<ServicesContextProps>;
  queryClient?: QueryClient;
}

export const renderWithProviders = (
  component: any,
  { queries = {}, queryClient, startUrl = undefined, ...renderOptions }: ExtendedRenderOptions = {},
) => {
  function Wrapper({ children }: React.PropsWithChildren<unknown>) {
    return (
      <MemoryRouter basename={APP_DEVELOPMENT_BASENAME} initialEntries={[startUrl]}>
        <ServicesContextProvider
          {...queriesMock}
          {...queries}
          client={queryClient}
          clientConfig={queryClientConfigMock}
        >
          <AppDevelopmentContextProvider>
            <Routes>
              <Route path='/:org/:app/*' element={children} />
            </Routes>
          </AppDevelopmentContextProvider>
        </ServicesContextProvider>
      </MemoryRouter>
    );
  }

  return {
    ...render(component, {
      wrapper: Wrapper,
      ...renderOptions,
    }),
  };
};
