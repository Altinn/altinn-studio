import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { ProcessEditor } from './ProcessEditor';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from '../../test/testUtils';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AppVersion } from 'app-shared/types/AppVersion';
import { textMock } from '../../../testing/mocks/i18nMock';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { useBpmnContext } from '../../../packages/process-editor/src/contexts/BpmnContext';
import { useWebSocket } from 'app-shared/hooks/useWebSocket';
import { WSConnector } from 'app-shared/websockets/WSConnector';
import { type SyncError, SyncSuccess } from './syncUtils';
import { processEditorWebSocketHub } from 'app-shared/api/paths';

// test data
const org = 'org';
const app = 'app';
const defaultAppVersion: AppVersion = { backendVersion: '8.0.0', frontendVersion: '4.0.0' };

jest.mock('app-shared/hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(),
}));

jest.mock('app-shared/hooks/useConfirmationDialogOnPageLeave', () => ({
  useConfirmationDialogOnPageLeave: jest.fn(),
}));

jest.mock('../../../packages/process-editor/src/contexts/BpmnContext', () => ({
  ...jest.requireActual('../../../packages/process-editor/src/contexts/BpmnContext'),
  useBpmnContext: jest.fn(),
}));

jest.mock('../../../packages/process-editor/src/components/Canvas', () => ({
  Canvas: () => <div></div>,
}));

jest.mock('app-shared/utils/featureToggleUtils', () => ({
  shouldDisplayFeature: jest.fn().mockReturnValue(true),
}));

describe('ProcessEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders spinner when appLibVersion is not fetched', () => {
    (useWebSocket as jest.Mock).mockReturnValue({ onWSMessageReceived: jest.fn() });

    renderProcessEditor();
    screen.getByText(textMock('process_editor.loading'));
  });

  it('renders processEditor with "noBpmnFound" error message when appLibVersion is fetched but no bpmn is found', () => {
    (useWebSocket as jest.Mock).mockReturnValue({ onWSMessageReceived: jest.fn() });

    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData([QueryKey.AppVersion, org, app], defaultAppVersion);
    renderProcessEditor({ queryClient: queryClientMock });
    screen.getByRole('heading', { name: textMock('process_editor.fetch_bpmn_error_title') });
  });

  it('renders processEditor with "No task selected" message in config panel when appLibVersion is fetched but no bpmnDetails are found', () => {
    (useWebSocket as jest.Mock).mockReturnValue({ onWSMessageReceived: jest.fn() });

    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData([QueryKey.AppVersion, org, app], defaultAppVersion);
    (useBpmnContext as jest.Mock).mockReturnValue({
      bpmnDetails: null,
    });
    renderProcessEditor({ bpmnFile: 'mockBpmn', queryClient: queryClientMock });
    screen.getByText(textMock('process_editor.configuration_view_panel_no_task'));
  });

  it('renders config panel for end event when bpmnDetails has endEvent type', () => {
    (useWebSocket as jest.Mock).mockReturnValue({ onWSMessageReceived: jest.fn() });

    const queryClientMock = createQueryClientMock();
    queryClientMock.setQueryData([QueryKey.AppVersion, org, app], defaultAppVersion);
    (useBpmnContext as jest.Mock).mockReturnValue({
      bpmnDetails: { type: 'bpmn:EndEvent' },
      isEditAllowed: true,
    });
    renderProcessEditor({ bpmnFile: 'mockBpmn', queryClient: queryClientMock });
    screen.getByText(textMock('process_editor.configuration_panel_end_event'));
  });

  it('should render the ProcessEditor component', () => {
    (useWebSocket as jest.Mock).mockReturnValue({ onWSMessageReceived: jest.fn() });
    renderProcessEditor();
  });

  it('should call useWebSocket with the correct parameters', () => {
    (useWebSocket as jest.Mock).mockReturnValue({ onWSMessageReceived: jest.fn() });
    renderProcessEditor();

    expect(useWebSocket).toHaveBeenCalledWith({
      webSocketUrl: processEditorWebSocketHub(),
      webSocketConnector: WSConnector,
    });
  });

  it('should invoke mockOnWSMessageReceived when error occur and display error message to the user', async () => {
    const syncErrorMock: SyncError = {
      errorCode: 'applicationMetadataTaskIdSyncError',
      source: {
        name: '',
        path: '',
      },
      details: '',
    };

    const mockOnWSMessageReceived = jest
      .fn()
      .mockImplementation((callback: Function) => callback(syncErrorMock));

    (useWebSocket as jest.Mock).mockReturnValue({
      ...jest.requireActual('app-shared/hooks/useWebSocket'),
      onWSMessageReceived: mockOnWSMessageReceived,
    });

    renderProcessEditor();

    await screen.findByText(textMock('process_editor.sync_error_application_metadata_task_id'));
  });

  it('should invoke mockOnWSMessageReceived with success details and console.log success', async () => {
    const syncSuccessMock: SyncSuccess = {
      source: {
        name: 'applicationMetadata.json',
        path: '/fake/path/applicationMetadata.json',
      },
    };

    const consoleSpy = jest.spyOn(console, 'log');

    const mockOnWSMessageReceived = jest
      .fn()
      .mockImplementation((callback: Function) => callback(syncSuccessMock));

    (useWebSocket as jest.Mock).mockReturnValue({
      ...jest.requireActual('app-shared/hooks/useWebSocket'),
      onWSMessageReceived: mockOnWSMessageReceived,
    });

    renderProcessEditor();
    expect(consoleSpy).toHaveBeenCalledWith('SyncSuccess received');
  });
});

const renderProcessEditor = ({ bpmnFile = null, queryClient = createQueryClientMock() } = {}) => {
  queryClient.setQueryData([QueryKey.FetchBpmn, org, app], bpmnFile);
  return renderWithProviders(<ProcessEditor />, {
    queryClient,
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
  });
};
