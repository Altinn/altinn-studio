import React from 'react';
import { screen } from '@testing-library/react';
import { ProcessEditor } from './ProcessEditor';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from '../../test/testUtils';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AppVersion } from 'app-shared/types/AppVersion';
import { textMock } from '../../../testing/mocks/i18nMock';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { useBpmnContext } from '../../../packages/process-editor/src/contexts/BpmnContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import userEvent from '@testing-library/user-event';
import { layoutSets } from 'app-shared/mocks/mocks';
import { layoutSetsMock } from '../../../packages/ux-editor/src/testing/layoutMock';
import type { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import { useWebSocket } from 'app-shared/hooks/useWebSocket';
import { WSConnector } from 'app-shared/websockets/WSConnector';
import { type SyncError } from './syncUtils';
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

  it('should invoke mockOnWSMessageReceived with error details', () => {
    const mockOnWSMessageReceived = jest.fn();
    (useWebSocket as jest.Mock).mockReturnValue({ onWSMessageReceived: mockOnWSMessageReceived });
    renderProcessEditor();

    const syncErrorMock: SyncError = {
      errorCode: 'applicationMetadataTaskIdSyncError',
      source: {
        name: '',
        path: '',
      },
      details: '',
    };

    mockOnWSMessageReceived(syncErrorMock);
    expect(mockOnWSMessageReceived).toHaveBeenCalledWith(syncErrorMock);
  });
});

const renderProcessEditor = ({ bpmnFile = null, queryClient = createQueryClientMock() } = {}) => {
  queryClient.setQueryData([QueryKey.FetchBpmn, org, app], bpmnFile);
  return renderWithProviders(<ProcessEditor />, {
    queryClient,
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
  });
};
