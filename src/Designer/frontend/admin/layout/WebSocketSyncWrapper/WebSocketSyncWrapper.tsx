import React from 'react';
import { useWebSocket } from 'app-shared/hooks/useWebSocket';
import { WSConnector } from 'app-shared/websockets/WSConnector';
import { useQueryClient } from '@tanstack/react-query';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { SyncError, SyncSuccess } from 'app-shared/types/api/SyncResponses';
import { syncAlertsUpdateWebSocketHub } from 'app-shared/api/paths';
import type { AlertsUpdated } from 'app-shared/types/api/AlertsUpdated';
import { AlertsUpdatedQueriesInvalidator } from 'app-shared/queryInvalidator/AlertsUpdatedQueriesInvalidator';

enum SyncAlertsClientName {
  AlertsUpdated = 'AlertsUpdated',
}

type WebSocketSyncWrapperProps = {
  children: React.ReactNode;
};
export const WebSocketSyncWrapper = ({
  children,
}: WebSocketSyncWrapperProps): React.ReactElement => {
  const { org } = useStudioEnvironmentParams();
  const queryClient = useQueryClient();
  const alertsUpdateInvalidator = AlertsUpdatedQueriesInvalidator.getInstance(queryClient, org);

  useWebSocket({
    webSocketUrls: [syncAlertsUpdateWebSocketHub()],
    clientsName: [SyncAlertsClientName.AlertsUpdated],
    webSocketConnector: WSConnector,
    onWSMessageReceived: (message: SyncError | SyncSuccess | AlertsUpdated): void => {
      if ('environment' in message) {
        alertsUpdateInvalidator.invalidateQueries(message.environment as string);
        return;
      }
    },
  });

  return <>{children}</>;
};
