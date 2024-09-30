import type { ReactNode } from 'react';
import React from 'react';
import { render } from '@testing-library/react';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { BrowserRouter } from 'react-router-dom';
import { PreviewConnectionContextProvider } from 'app-shared/providers/PreviewConnectionContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { QueryClient } from '@tanstack/react-query';
import { queryClientConfigMock } from 'app-shared/mocks/queryClientMock';
import { useInstanceIdQuery } from 'app-shared/hooks/queries';

jest.mock('app-shared/hooks/queries');

export const textLanguagesMock = ['nb', 'nn', 'en'];
export const mockLayoutId: string = 'layout1';

export const renderWithProviders =
  (queries: Partial<ServicesContextProps> = {}, queryClient?: QueryClient) =>
  (component: ReactNode) => {
    (useInstanceIdQuery as jest.Mock).mockReturnValue(mockLayoutId);

    const renderResult = render(
      <ServicesContextProvider
        {...queriesMock}
        {...queries}
        client={queryClient}
        clientConfig={queryClientConfigMock}
      >
        <PreviewConnectionContextProvider>
          <BrowserRouter>{component}</BrowserRouter>
        </PreviewConnectionContextProvider>
      </ServicesContextProvider>,
    );
    return { renderResult: { ...renderResult } };
  };
