import { render, screen } from '@testing-library/react';
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
      (expectedPackage, frontendVersion) => {
        renderUiEditor(frontendVersion);
        expect(screen.getByTestId(expectedPackage)).toBeInTheDocument();
      },
    );

    const renderUiEditor = (frontendVersion: string | null) =>
      renderSubapp(RoutePaths.UIEditor, frontendVersion);
  });
});

const renderSubapp = (path: RoutePaths, frontendVersion: string = null) => {
  const Subapp = routerRoutes.find((route) => route.path === path)!.subapp;
  const appVersion: AppVersion = {
    frontendVersion,
    backendVersion: '7.0.0',
  };
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.AppVersion, org, app], appVersion);
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
