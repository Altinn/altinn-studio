import { render, screen } from '@testing-library/react';
import { routerRoutes } from './routes';
import { RoutePaths } from '../enums/RoutePaths';
import React from 'react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AppVersion } from 'app-shared/types/AppVersion';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';

// Mocks:
jest.mock('../../packages/ux-editor-v3/src/SubApp', () => ({
  SubApp: () => <div data-testid='version 3' />,
}));
jest.mock('../../packages/ux-editor/src/SubApp', () => ({
  SubApp: () => <div data-testid='latest version' />,
}));

// Test data
const org = 'org';
const app = 'app';

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
      <Subapp />
    </ServicesContextProvider>,
  );
};
