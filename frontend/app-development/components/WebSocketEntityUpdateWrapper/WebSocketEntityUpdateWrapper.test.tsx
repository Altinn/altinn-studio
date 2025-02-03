import type { ReactNode } from 'react';
import React from 'react';
import { waitFor } from '@testing-library/react';
import { useWebSocket } from 'app-development/hooks/useWebSocket';
import { WSConnector } from 'app-shared/websockets/WSConnector';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { app, org } from '@studio/testing/testids';
import { EntityUpdatedQueriesInvalidator } from 'app-shared/queryInvalidator/EntityUpdatedQueriesInvalidator';
import { renderWithProviders } from '../../test/testUtils';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { syncEntityUpdateWebSocketHub } from 'app-shared/api/paths';
import type { EntityUpdated } from 'app-shared/types/api/EntityUpdated';
import { WebSocketEntityUpdateWrapper } from './WebSocketEntityUpdateWrapper';

jest.mock('app-development/hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(),
}));

describe('WebSocketEntityUpdateWrapper', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call useWebSocket with the correct parameters', () => {
    (useWebSocket as jest.Mock).mockReturnValue({ onWSMessageReceived: jest.fn() });
    renderWebSocketEntityUpdateWrapper();

    expect(useWebSocket).toHaveBeenCalledWith({
      clientsName: ['EntityUpdate'],
      webSocketUrl: syncEntityUpdateWebSocketHub(),
      webSocketConnector: WSConnector,
    });
  });

  it('should invoke onWSMessageReceived when EntityUpdated message is received', async () => {
    const entityUpdatedMock: EntityUpdated = {
      resourceName: 'Deployment', // Example resource name for entity update
    };

    const mockOnWSMessageReceived = jest
      .fn()
      .mockImplementation((callback: Function) => callback(entityUpdatedMock));

    (useWebSocket as jest.Mock).mockReturnValue({
      ...jest.requireActual('app-development/hooks/useWebSocket'),
      onWSMessageReceived: mockOnWSMessageReceived,
    });

    renderWebSocketEntityUpdateWrapper();

    // Ensure that the entity update message was received
    await waitFor(() => {
      expect(mockOnWSMessageReceived).toHaveBeenCalled();
    });
  });

  it('should invalidate query cache when EntityUpdated message is received', async () => {
    const entityUpdatedMock: EntityUpdated = {
      resourceName: 'Deployment', // Example resource name for entity update
    };

    const queryClientMock = createQueryClientMock();
    const invalidator = EntityUpdatedQueriesInvalidator.getInstance(queryClientMock, org, app);

    invalidator.invalidateQueriesByResourceName = jest.fn();
    const mockOnWSMessageReceived = jest
      .fn()
      .mockImplementation((callback: Function) => callback(entityUpdatedMock));

    (useWebSocket as jest.Mock).mockReturnValue({
      ...jest.requireActual('app-development/hooks/useWebSocket'),
      onWSMessageReceived: mockOnWSMessageReceived,
    });

    renderWebSocketEntityUpdateWrapper();

    // Ensure invalidateQueriesByResourceName is called with the correct resource name
    await waitFor(() => {
      expect(invalidator.invalidateQueriesByResourceName).toHaveBeenCalledWith(
        entityUpdatedMock.resourceName,
      );
    });
  });
});

const mockChildren: ReactNode = <div></div>;

const renderWebSocketEntityUpdateWrapper = () => {
  const queryClient = createQueryClientMock();
  return renderWithProviders(
    <WebSocketEntityUpdateWrapper>{mockChildren}</WebSocketEntityUpdateWrapper>,
    {
      queryClient,
      startUrl: `${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
    },
  );
};
