import { screen, waitFor } from '@testing-library/react';
import React from 'react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AppVersion } from 'app-shared/types/AppVersion';
import { app, org } from '@studio/testing/testids';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { UiEditor } from './UiEditor';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { renderWithProviders } from '../../test/testUtils';

// Mocks:
jest.mock('@altinn/ux-editor-v3/SubApp', () => ({
  SubApp: () => <div data-testid='version 3' />,
}));
jest.mock('@altinn/ux-editor/SubApp', () => ({
  SubApp: ({ onLayoutSetNameChange }: { onLayoutSetNameChange: (name: string) => void }) => {
    React.useEffect(() => {
      onLayoutSetNameChange('test-layout');
    }, [onLayoutSetNameChange]);
    return <div data-testid='latest version' />;
  },
}));

describe('UiEditor', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Returns null when there is no AppVersion', async () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.AppVersion, org, app], null);
    renderUiEditor(queryClient);
    expect(screen.queryByTestId('version 3')).not.toBeInTheDocument();
    expect(screen.queryByTestId('latest version')).not.toBeInTheDocument();
  });

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

  it('renders a loading spinner while fetching frontend version', () => {
    renderUiEditor();
    expect(screen.getByLabelText(textMock('ux_editor.loading_page'))).toBeInTheDocument();
  });
});

const renderUiEditor = (queryClient = createQueryClientMock()) => {
  return renderWithProviders(<UiEditor />, {
    queryClient,
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
  });
};
