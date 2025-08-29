import type { ReactNode } from 'react';
import React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { BrowserRouter } from 'react-router-dom';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { QueryClient } from '@tanstack/react-query';
import { queryClientConfigMock } from 'app-shared/mocks/queryClientMock';
import { GiteaHeaderContext, type GiteaHeaderContextProps } from '../context/GiteaHeaderContext';
import { app, org } from '@studio/testing/testids';

export const renderWithProviders =
  (
    queries: Partial<ServicesContextProps> = {},
    queryClient?: QueryClient,
    giteaContextProps: Partial<GiteaHeaderContextProps> = {},
  ) =>
  (component: ReactNode): RenderResult => {
    const renderResult = render(
      <ServicesContextProvider
        {...queriesMock}
        {...queries}
        client={queryClient}
        clientConfig={queryClientConfigMock}
      >
        <GiteaHeaderContext.Provider
          value={{ ...defaultGiteaHeaderContextProps, ...giteaContextProps }}
        >
          <BrowserRouter>{component}</BrowserRouter>
        </GiteaHeaderContext.Provider>
      </ServicesContextProvider>,
    );
    return renderResult;
  };

const defaultGiteaHeaderContextProps: GiteaHeaderContextProps = {
  owner: org,
  repoName: app,
};
