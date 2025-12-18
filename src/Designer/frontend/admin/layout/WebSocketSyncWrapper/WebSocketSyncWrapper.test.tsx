import type { ReactNode } from 'react';
import React from 'react';
import { act, render } from '@testing-library/react';
import { useWebSocket } from 'app-shared/hooks/useWebSocket';
import { syncAlertsUpdateWebSocketHub } from 'app-shared/api/paths';
import { WSConnector } from 'app-shared/websockets/WSConnector';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { org } from '@studio/testing/testids';
import { WebSocketSyncWrapper } from './WebSocketSyncWrapper';
import { QueryClientProvider } from '@tanstack/react-query';
import type { AlertsUpdated } from 'app-shared/types/api/AlertsUpdated';
import { AlertsUpdatedQueriesInvalidator } from 'app-shared/queryInvalidator/AlertsUpdatedQueriesInvalidator';
import { QueryKey } from 'app-shared/types/QueryKey';

jest.mock('app-shared/hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(),
}));

describe('WebSocketSyncWrapper', () => {
  beforeAll(() => {
    jest.useFakeTimers({ advanceTimers: true });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should invalidate queries by environment when a message with environment is received', async () => {
    const alertsUpdateMock: AlertsUpdated = {
      environment: 'environment-123',
    };
    const queryClientMock = createQueryClientMock();
    queryClientMock.invalidateQueries = jest.fn();
    AlertsUpdatedQueriesInvalidator.getInstance(queryClientMock, org, 0);

    const queryKeys = [
      [QueryKey.ErrorMetrics, org, alertsUpdateMock.environment],
      [QueryKey.AppErrorMetrics, org, alertsUpdateMock.environment],
    ];

    (useWebSocket as jest.Mock).mockImplementation(({ onWSMessageReceived }) => {
      onWSMessageReceived(alertsUpdateMock);
    });

    renderWebSocketSyncWrapper();

    act(() => jest.advanceTimersByTime(1000));

    queryKeys.forEach((queryKey) => {
      expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({
        queryKey,
      });
    });
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
