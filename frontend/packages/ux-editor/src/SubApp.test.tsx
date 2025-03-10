import type { ReactNode } from 'react';
import React from 'react';
import { SubApp } from './SubApp';
import { render, screen, within } from '@testing-library/react';
import { appContextMock } from './testing/appContextMock';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { QueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';

const providerTestId = 'provider';
const appTestId = 'app';
const formNavigationTestId = 'formNavigation';
jest.mock('./AppContext', () => ({
  AppContextProvider: ({ children }: { children: ReactNode }) => {
    return <div data-testid={providerTestId}>{children}</div>;
  },
}));
jest.mock('./hooks', () => ({
  useAppContext: () => {
    return {};
  },
}));
jest.mock('./containers/FormDesignNavigation', () => ({
  FormDesignerNavigation: () => {
    return <div data-testid={formNavigationTestId}>Form Designer Navigation</div>;
  },
}));
jest.mock('./App', () => ({
  App: () => {
    return <div data-testid={appTestId}>App</div>;
  },
}));

jest.mock('app-shared/utils/featureToggleUtils', () => ({
  ...jest.requireActual('app-shared/utils/featureToggleUtils'),
  shouldDisplayFeature: jest.fn(),
}));

describe('SubApp', () => {
  it('Renders the app within the AppContext provider', () => {
    renderWithProviders();
    const provider = screen.getByTestId(providerTestId);
    expect(provider).toBeInTheDocument();
    expect(within(provider).getByTestId(appTestId)).toBeInTheDocument();
  });

  it('renders FormDesignerNavigation when task navigation is enabled and no layout set is selected', () => {
    (shouldDisplayFeature as jest.Mock).mockImplementation(
      (feature) => feature === FeatureFlag.TaskNavigation,
    );
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.AppVersion, org, app], {
      frontendVersion: '4.0.0',
      backendVersion: '7.0.0',
    });
    renderWithProviders(queryClient);
    const provider = screen.getByTestId(providerTestId);
    expect(provider).toBeInTheDocument();
    expect(within(provider).getByTestId(formNavigationTestId)).toBeInTheDocument();
  });
});

const renderWithProviders = (queryClient?: QueryClient) => {
  return render(
    <ServicesContextProvider {...queriesMock} client={queryClient}>
      <SubApp {...appContextMock} />
    </ServicesContextProvider>,
  );
};
