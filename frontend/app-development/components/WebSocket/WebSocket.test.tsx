import type { ReactNode } from 'react';
import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { useWebSocket } from 'app-shared/hooks/useWebSocket';
import { SyncEventsWebSocketHub } from 'app-shared/api/paths';
import { WSConnector } from 'app-shared/websockets/WSConnector';
import type { SyncError, SyncSuccess } from 'app-shared/types/api/SyncResponses';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { app, org } from '@studio/testing/testids';
import { SyncSuccessQueriesInvalidator } from 'app-shared/queryInvalidator/SyncSuccessQueriesInvalidator';
import { WebSocket } from './WebSocket';
import { renderWithProviders } from '../../test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';

jest.mock('app-shared/hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(),
}));

describe('WebSocket', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call useWebSocket with the correct parameters', () => {
    (useWebSocket as jest.Mock).mockReturnValue({ onWSMessageReceived: jest.fn() });
    renderWebSocket();

    expect(useWebSocket).toHaveBeenCalledWith({
      clientsName: ['FileSyncSuccess', 'FileSyncError'],
      webSocketUrl: SyncEventsWebSocketHub(),
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

    renderWebSocket();

    await screen.findByText(textMock('process_editor.sync_error_application_metadata_task_id'));
  });

  it('should invalidate query cache to the updated file when mockOnWSMessageReceived is invoked with success details', async () => {
    const syncSuccessMock: SyncSuccess = {
      source: {
        name: 'applicationMetadata.json',
        path: '/fake/path/applicationMetadata.json',
      },
    };

    const queryClientMock = createQueryClientMock();
    const invalidator = SyncSuccessQueriesInvalidator.getInstance(queryClientMock, org, app);

    invalidator.invalidateQueryByFileName = jest.fn();
    const mockOnWSMessageReceived = jest
      .fn()
      .mockImplementation((callback: Function) => callback(syncSuccessMock));

    (useWebSocket as jest.Mock).mockReturnValue({
      ...jest.requireActual('app-shared/hooks/useWebSocket'),
      onWSMessageReceived: mockOnWSMessageReceived,
    });

    renderWebSocket();
    await waitFor(() => {
      expect(invalidator.invalidateQueryByFileName).toHaveBeenCalledWith(
        syncSuccessMock.source.name,
        null, // selectedLayoutSet is not set at this point
      );
    });
  });
});

const mockChildren: ReactNode = <div></div>;

const renderWebSocket = () => {
  const queryClient = createQueryClientMock();
  return renderWithProviders(<WebSocket>{mockChildren}</WebSocket>, {
    queryClient,
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
  });
};
