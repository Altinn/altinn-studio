import type { ReactNode } from 'react';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { useWebSocket } from 'app-shared/hooks/useWebSocket';
import { syncAlertsUpdateWebSocketHub } from 'app-shared/api/paths';
import { WSConnector } from 'app-shared/websockets/WSConnector';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { org } from '@studio/testing/testids';
import { WebSocketSyncWrapper } from './WebSocketSyncWrapper';
import { QueryClientProvider } from '@tanstack/react-query';
import type { AlertsUpdated } from 'app-shared/types/api/AlertsUpdated';
import { AlertsUpdatedQueriesInvalidator } from 'app-shared/queryInvalidator/AlertsUpdatedQueriesInvalidator';

jest.mock('app-shared/hooks/useWebSocket', () => ({
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
      clientsName: ['AlertsUpdated'],
      webSocketUrls: [syncAlertsUpdateWebSocketHub()],
      webSocketConnector: WSConnector,
      onWSMessageReceived: expect.any(Function),
    });
  });

  it('should invalidate queries by environment when a message with environment is received', async () => {
    const alertsUpdateMock: AlertsUpdated = {
      environment: 'environment-123',
    };
    const queryClientMock = createQueryClientMock();
    const invalidator = AlertsUpdatedQueriesInvalidator.getInstance(queryClientMock, org);
    invalidator.invalidateQueries = jest.fn();

    (useWebSocket as jest.Mock).mockImplementation(({ onWSMessageReceived }) => {
      onWSMessageReceived(alertsUpdateMock);
    });

    renderWebSocketSyncWrapper();

    await waitFor(() => {
      expect(invalidator.invalidateQueries).toHaveBeenCalledWith(alertsUpdateMock.environment);
    });
  });
});

const mockChildren: ReactNode = <div></div>;

const renderWebSocketSyncWrapper = () => {
  const queryClient = createQueryClientMock();
  return render(
    <QueryClientProvider client={queryClient}>
      <WebSocketSyncWrapper>{mockChildren}</WebSocketSyncWrapper>
    </QueryClientProvider>,
  );
};
