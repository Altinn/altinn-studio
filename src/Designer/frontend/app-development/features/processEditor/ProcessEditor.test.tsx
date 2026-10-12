import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import ProcessEditor from './ProcessEditor';
import { renderWithProviders } from '../../test/testUtils';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import type { AppVersion } from 'app-shared/types/AppVersion';

const latestEditorText = 'latest process editor';
const v8EditorText = 'v8 process editor';

vi.mock('@altinn/process-editor', () => ({
  ProcessEditor: () => <div>{latestEditorText}</div>,
}));

vi.mock('@altinn/process-editor-v8', () => ({
  ProcessEditor: () => <div>{v8EditorText}</div>,
}));

describe('ProcessEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a spinner while loading the app version', () => {
    renderProcessEditor();

    expect(screen.getByLabelText(textMock('process_editor.loading'))).toBeInTheDocument();
  });

  it.each(['9.0.0', '10.0.0'])(
    'renders the latest process editor for backend version %s',
    (backendVersion) => {
      renderProcessEditor({ backendVersion, frontendVersion: '4.0.0' });

      expect(screen.getByText(latestEditorText)).toBeInTheDocument();
      expect(screen.queryByText(v8EditorText)).not.toBeInTheDocument();
    },
  );

  it.each(['4.0.0', '9.0.0'])(
    'renders the v8 process editor for backend version 8 regardless of frontend version %s',
    (frontendVersion) => {
      renderProcessEditor({ backendVersion: '8.9.0', frontendVersion });

      expect(screen.getByText(v8EditorText)).toBeInTheDocument();
      expect(screen.queryByText(latestEditorText)).not.toBeInTheDocument();
    },
  );

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
