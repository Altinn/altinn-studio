import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { SubApp } from './SubApp';
import { render, screen, within } from '@testing-library/react';
import { appContextMock } from './testing/appContextMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { QueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, layoutSet, org } from '@studio/testing/testids';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const providerTestId = 'provider';
const appTestId = 'app';
const formNavigationTestId = 'formNavigation';
vi.mock('./AppContext', () => ({
  AppContextProvider: ({ children }: { children: ReactNode }) => {
    return <div data-testid={providerTestId}>{children}</div>;
  },
}));
vi.mock('./containers/FormDesignNavigation', () => ({
  FormDesignerNavigation: () => {
    return <div data-testid={formNavigationTestId}>Form Designer Navigation</div>;
  },
}));
vi.mock('app-shared/utils/featureToggleUtils', async () => ({
  ...(await vi.importActual('app-shared/utils/featureToggleUtils')),
  shouldDisplayFeature: vi.fn(),
}));
vi.mock('./containers/FormDesignNavigation', () => ({
  FormDesignerNavigation: () => {
    return <div data-testid={formNavigationTestId}>Form Designer Navigation</div>;
  },
}));
vi.mock('./App', () => ({
  App: () => {
    return <div data-testid={appTestId}>App</div>;
  },
}));
describe('SubApp', () => {
  it('renders FormDesigner when a layout set is selected', () => {
    renderWithProviders();
    const provider = screen.getByTestId(providerTestId);
    expect(provider).toBeInTheDocument();
    expect(within(provider).getByTestId(appTestId)).toBeInTheDocument();
  });

  it('renders FormDesignerNavigation when no layout set is selected', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.AppVersion, org, app], {
      frontendVersion: '4.0.0',
      backendVersion: '7.0.0',
    });
    renderWithProviders(queryClient, [`/${org}/${app}`]);
    const provider = screen.getByTestId(providerTestId);
    expect(provider).toBeInTheDocument();
    expect(within(provider).getByTestId(formNavigationTestId)).toBeInTheDocument();
  });
});

const renderWithProviders = (
  queryClient?: QueryClient,
  initialEntries = [`/${org}/${app}/layoutSet/${layoutSet}`],
) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route
          path='/:org/:app/*'
          element={
            <ServicesContextProvider {...queriesMock} client={queryClient}>
              <SubApp {...appContextMock} />
            </ServicesContextProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
};
