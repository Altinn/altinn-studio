import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import type { ReactNode } from 'react';
import { act, render } from '@testing-library/react';
import { useWebSocket } from 'app-shared/hooks/useWebSocket';
import { syncAlertsUpdateWebSocketHub } from 'app-shared/api/paths';
import { WSConnector } from 'app-shared/websockets/WSConnector';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { app, org } from '@studio/testing/testids';
import { WebSocketSyncWrapper } from './WebSocketSyncWrapper';
import { QueryClientProvider } from '@tanstack/react-query';
import type { AlertsUpdated } from 'app-shared/types/api/AlertsUpdated';
import { AlertsUpdatedQueriesInvalidator } from 'app-shared/queryInvalidator/AlertsUpdatedQueriesInvalidator';
import { QueryKey } from 'app-shared/types/QueryKey';

vi.mock('app-shared/hooks/useWebSocket', () => ({
  useWebSocket: vi.fn(),
}));
vi.mock('admin/hooks/useRequiredRoutePathsParams', () => ({
  useRequiredRoutePathsParams: () => ({ owner: org, app }),
}));

describe('WebSocketSyncWrapper', () => {
  beforeAll(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should invalidate queries by environment when a message with environment is received', async () => {
    const alertsUpdateMock: AlertsUpdated = {
      environment: 'environment-123',
    };
    const queryClientMock = createQueryClientMock();
    queryClientMock.invalidateQueries = vi.fn();
    AlertsUpdatedQueriesInvalidator.getInstance(queryClientMock, org, 0);

    const queryKeys = [
      [QueryKey.ErrorMetrics, org, alertsUpdateMock.environment],
      [QueryKey.AppErrorMetrics, org, alertsUpdateMock.environment],
    ];

    (useWebSocket as Mock).mockImplementation(({ onWSMessageReceived }) => {
      onWSMessageReceived(alertsUpdateMock);
    });

    renderWebSocketSyncWrapper(queryClientMock);

    act(() => vi.advanceTimersByTime(1000));

    queryKeys.forEach((queryKey) => {
      expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({
        queryKey,
      });
    });
  });

  it('should call useWebSocket with the correct parameters', () => {
    (useWebSocket as Mock).mockReturnValue({ onWSMessageReceived: vi.fn() });
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

const renderWebSocketSyncWrapper = (queryClient = createQueryClientMock()) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <WebSocketSyncWrapper>{mockChildren}</WebSocketSyncWrapper>
    </QueryClientProvider>,
  );
};
