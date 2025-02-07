import type { ReactNode } from 'react';
import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { useWebSocket } from 'app-development/hooks/useWebSocket';
import { syncEntityUpdateWebSocketHub, syncEventsWebSocketHub } from 'app-shared/api/paths';
import { WSConnector } from 'app-shared/websockets/WSConnector';
import type { SyncError, SyncSuccess } from 'app-shared/types/api/SyncResponses';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { app, org } from '@studio/testing/testids';
import { SyncSuccessQueriesInvalidator } from 'app-shared/queryInvalidator/SyncSuccessQueriesInvalidator';
import { WebSocketSyncWrapper } from './WebSocketSyncWrapper';
import { renderWithProviders } from '../../test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import type { EntityUpdated } from 'app-shared/types/api/EntityUpdated';
import { EntityUpdatedQueriesInvalidator } from 'app-shared/queryInvalidator/EntityUpdatedQueriesInvalidator';

jest.mock('app-development/hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(),
}));

describe('WebSocketSyncWrapper', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call useWebSocket with the correct parameters', () => {
    (useWebSocket as jest.Mock).mockReturnValue({ onWSMessageReceived: jest.fn() });
    renderWebSocketSyncWrapper();

    expect(useWebSocket).toHaveBeenCalledWith({
      clientsName: ['FileSyncSuccess', 'FileSyncError', 'EntityUpdated'],
      webSocketUrls: [syncEntityUpdateWebSocketHub(), syncEventsWebSocketHub()],
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
      ...jest.requireActual('app-development/hooks/useWebSocket'),
      onWSMessageReceived: mockOnWSMessageReceived,
    });

    renderWebSocketSyncWrapper();

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

    invalidator.invalidateQueriesByFileLocation = jest.fn();
    const mockOnWSMessageReceived = jest
      .fn()
      .mockImplementation((callback: Function) => callback(syncSuccessMock));

    (useWebSocket as jest.Mock).mockReturnValue({
      ...jest.requireActual('app-development/hooks/useWebSocket'),
      onWSMessageReceived: mockOnWSMessageReceived,
    });

    renderWebSocketSyncWrapper();
    await waitFor(() => {
      expect(invalidator.invalidateQueriesByFileLocation).toHaveBeenCalledWith(
        syncSuccessMock.source.name,
      );
    });
  });

  it('should invalidate entity queries by resourceName when a message with resourceName is received', async () => {
    const entityUpdateMock: EntityUpdated = {
      resourceName: 'entityResourceName',
    };
    const queryClientMock = createQueryClientMock();
    const invalidator = EntityUpdatedQueriesInvalidator.getInstance(queryClientMock, org, app);
    invalidator.invalidateQueriesByResourceName = jest.fn();

    const mockOnWSMessageReceived = jest
      .fn()
      .mockImplementation((callback: Function) => callback(entityUpdateMock));

    (useWebSocket as jest.Mock).mockReturnValue({
      ...jest.requireActual('app-development/hooks/useWebSocket'),
      onWSMessageReceived: mockOnWSMessageReceived,
    });

    renderWebSocketSyncWrapper();

    await waitFor(() => {
      expect(invalidator.invalidateQueriesByResourceName).toHaveBeenCalledWith(
        entityUpdateMock.resourceName,
      );
    });
  });
});

const mockChildren: ReactNode = <div></div>;

const renderWebSocketSyncWrapper = () => {
  const queryClient = createQueryClientMock();
  return renderWithProviders(<WebSocketSyncWrapper>{mockChildren}</WebSocketSyncWrapper>, {
    queryClient,
    startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
  });
};
