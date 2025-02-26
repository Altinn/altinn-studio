import { render, screen, waitFor } from '@testing-library/react';
import { routerRoutes } from './routes';
import { RoutePaths } from '../enums/RoutePaths';
import React from 'react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AppVersion } from 'app-shared/types/AppVersion';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { app, org } from '@studio/testing/testids';
import { SettingsModalContextProvider } from '../contexts/SettingsModalContext';
import { PreviewContextProvider } from '../contexts/PreviewContext';
import { AppDevelopmentContextProvider } from '../contexts/AppDevelopmentContext';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { QueryClient } from '@tanstack/react-query';

// Mocks:
jest.mock('@altinn/ux-editor-v3/SubApp', () => ({
  SubApp: () => <div data-testid='version 3' />,
}));
jest.mock('@altinn/ux-editor/SubApp', () => ({
  SubApp: () => <div data-testid='latest version' />,
}));

describe('routes', () => {
  describe(RoutePaths.UIEditor, () => {
    type FrontendVersion = null | '3.0.0' | '4.0.0';
    type PackageVersion = 'version 3' | 'latest version';
    type TestCase = [PackageVersion, FrontendVersion];

    const testCases: TestCase[] = [
      ['version 3', null],
      ['version 3', '3.0.0'],
      ['latest version', '4.0.0'],
    ];

    it.each(testCases)(
      'Renders the %s schema editor page when the app frontend version is %s',
      async (expectedPackage, frontendVersion) => {
        const appVersion: AppVersion = {
          frontendVersion,
          backendVersion: '7.0.0',
        };
        const queryClient = createQueryClientMock();
        queryClient.setQueryData([QueryKey.AppVersion, org, app], appVersion);
        renderUiEditor(queryClient);
        expect(await screen.findByTestId(expectedPackage)).toBeInTheDocument();
      },
    );

    it('renders a loading spinner', async () => {
      renderUiEditor();
      await waitFor(() => {
        expect(screen.getByTestId('studio-spinner-test-id')).toBeInTheDocument();
      });
    });

    it('renders a loading spinner message while pending', () => {
      renderUiEditor();
      expect(screen.getByText(textMock('overview.header_loading'))).toBeInTheDocument();
    });

    const renderUiEditor = (queryClient: QueryClient = createQueryClientMock()) =>
      renderSubapp(RoutePaths.UIEditor, queryClient);
  });
});

const renderSubapp = (path: RoutePaths, queryClient: QueryClient) => {
  const Subapp = routerRoutes.find((route) => route.path === path)!.subapp;

  return render(
    <ServicesContextProvider {...queriesMock} client={queryClient}>
      <SettingsModalContextProvider>
        <PreviewContextProvider>
          <AppDevelopmentContextProvider>
            <Subapp />
          </AppDevelopmentContextProvider>
        </PreviewContextProvider>
      </SettingsModalContextProvider>
    </ServicesContextProvider>,
  );
};
