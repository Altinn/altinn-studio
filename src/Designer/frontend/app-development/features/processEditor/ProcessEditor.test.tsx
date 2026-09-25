import { screen } from '@testing-library/react';
import ProcessEditor from './ProcessEditor';
import { renderWithProviders } from '../../test/testUtils';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import type { AppVersion } from 'app-shared/types/AppVersion';

const v8EditorText = 'v8 process editor';

jest.mock('@altinn/process-editor-v8', () => ({
  ProcessEditor: () => <div>{v8EditorText}</div>,
}));

describe('ProcessEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a spinner while the app version is being fetched', () => {
    renderProcessEditor();

    expect(screen.getByLabelText(textMock('process_editor.loading'))).toBeInTheDocument();
  });

  it('leaves the v9 route empty while the new editor is being prepared', () => {
    renderProcessEditor({ backendVersion: '9.0.0', frontendVersion: '4.0.0' });

    expect(screen.queryByText(v8EditorText)).not.toBeInTheDocument();
  });

  it('renders the v8 process editor when the app library version is below 9', () => {
    renderProcessEditor({ backendVersion: '8.9.0', frontendVersion: '4.0.0' });

    expect(screen.getByText(v8EditorText)).toBeInTheDocument();
  });

  it('renders the v8 process editor when the app library version is unknown', () => {
    renderProcessEditor({ backendVersion: undefined, frontendVersion: undefined });

    expect(screen.getByText(v8EditorText)).toBeInTheDocument();
  });
});

const renderProcessEditor = (appVersion?: Partial<AppVersion>) => {
  const queryClient = createQueryClientMock();
  if (appVersion) {
    queryClient.setQueryData([QueryKey.AppVersion, org, app], appVersion);
  }
  return renderWithProviders(<ProcessEditor />, {
    queryClient,
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
  });
};
