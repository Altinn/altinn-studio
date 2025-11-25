import React from 'react';
import { useWebSocket } from 'app-shared/hooks/useWebSocket';
import { WSConnector } from 'app-shared/websockets/WSConnector';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTranslation } from 'react-i18next';
import type { SyncError, SyncSuccess } from 'app-shared/types/api/SyncResponses';
import { SyncUtils } from 'app-shared/utils/SyncUtils.ts';
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
  const { t } = useTranslation();
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

      const isErrorMessage = 'errorCode' in message;
      if (isErrorMessage) {
        toast.error(t(SyncUtils.getSyncErrorMessage(message)), { toastId: message.errorCode });
        return;
      }
    },
  });

  return <>{children}</>;
};
