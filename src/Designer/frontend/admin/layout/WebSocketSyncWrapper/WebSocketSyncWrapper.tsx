import type { ReactElement } from 'react';
import React from 'react';
import { useWebSocket } from 'app-shared/hooks/useWebSocket';
import { WSConnector } from 'app-shared/websockets/WSConnector';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTranslation } from 'react-i18next';
import type { SyncError, SyncSuccess } from 'app-shared/types/api/SyncResponses';
import { SyncUtils } from 'app-shared/utils/SyncUtils.ts';
import { syncEntityUpdateWebSocketHub } from 'app-shared/api/paths';
import type { EntityUpdated } from 'app-shared/types/api/EntityUpdated';
import { EntityUpdatedQueriesInvalidator } from 'app-shared/queryInvalidator/EntityUpdatedQueriesInvalidator';

enum SyncEntityClientName {
  EntityUpdated = 'EntityUpdated',
}

type WebSocketSyncWrapperProps = {
  children: React.ReactNode;
};
export const WebSocketSyncWrapper = ({
  children,
}: WebSocketSyncWrapperProps): React.ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const queryClient = useQueryClient();
  const entityUpdateInvalidator = EntityUpdatedQueriesInvalidator.getInstance(
    queryClient,
    org,
    app,
  );

  const { onWSMessageReceived } = useWebSocket({
    webSocketUrls: [syncEntityUpdateWebSocketHub()],
    clientsName: [SyncEntityClientName.EntityUpdated],
    webSocketConnector: WSConnector,
  });

  onWSMessageReceived<SyncError | SyncSuccess | EntityUpdated>((message): ReactElement => {
    if ('resourceName' in message) {
      entityUpdateInvalidator.invalidateQueriesByResourceName(message.resourceName as string);
      return;
    }

    const isErrorMessage = 'errorCode' in message;
    if (isErrorMessage) {
      toast.error(t(SyncUtils.getSyncErrorMessage(message)), { toastId: message.errorCode });
      return;
    }
  });
  return <>{children}</>;
};
