import React from 'react';
import { useWebSocket } from 'app-shared/hooks/useWebSocket';
import { useQueryClient } from '@tanstack/react-query';
import type { SyncError, SyncSuccess } from 'app-shared/types/api/SyncResponses';
import { syncAlertsUpdateWebSocketHub } from 'app-shared/api/paths';
import type { AlertsUpdated } from 'app-shared/types/api/AlertsUpdated';
import { AlertsUpdatedQueriesInvalidator } from 'app-shared/queryInvalidator/AlertsUpdatedQueriesInvalidator';
import { useRequiredRoutePathsParams } from 'admin/hooks/useRequiredRoutePathsParams';

enum SyncAlertsMethodName {
  AlertsUpdated = 'AlertsUpdated',
}

type WebSocketSyncWrapperProps = {
  children: React.ReactNode;
};
export const WebSocketSyncWrapper = ({
  children,
}: WebSocketSyncWrapperProps): React.ReactElement => {
  const { owner } = useRequiredRoutePathsParams(['owner']);
  const queryClient = useQueryClient();
  const alertsUpdateInvalidator = AlertsUpdatedQueriesInvalidator.getInstance(queryClient, owner);

  useWebSocket({
    webSocketUrls: [syncAlertsUpdateWebSocketHub()],
    methodNames: [SyncAlertsMethodName.AlertsUpdated],
    onWSMessageReceived: (message: SyncError | SyncSuccess | AlertsUpdated): void => {
      if ('environment' in message) {
        alertsUpdateInvalidator.invalidateQueries(message.environment as string);
        return;
      }
    },
  });

  return <>{children}</>;
};
