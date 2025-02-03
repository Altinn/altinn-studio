import type { ReactElement } from 'react';
import React from 'react';
import { useWebSocket } from 'app-development/hooks/useWebSocket';
import { WSConnector } from 'app-shared/websockets/WSConnector';
import { syncEntityUpdateWebSocketHub } from 'app-shared/api/paths';
import { EntityUpdatedQueriesInvalidator } from 'app-shared/queryInvalidator/EntityUpdatedQueriesInvalidator';
import { useQueryClient } from '@tanstack/react-query';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { EntityUpdated } from 'app-shared/types/api/EntityUpdated';

enum SyncEntityClientName {
  EntityUpdate = 'EntityUpdate',
}

type WebSocketEntityUpdateWrapperProps = {
  children: React.ReactNode;
};
export const WebSocketEntityUpdateWrapper = ({
  children,
}: WebSocketEntityUpdateWrapperProps): ReactElement => {
  const { org, app } = useStudioEnvironmentParams();
  const queryClient = useQueryClient();
  const invalidator = EntityUpdatedQueriesInvalidator.getInstance(queryClient, org, app);

  const { onWSMessageReceived } = useWebSocket({
    webSocketUrl: syncEntityUpdateWebSocketHub(),
    clientsName: [SyncEntityClientName.EntityUpdate],
    webSocketConnector: WSConnector,
  });

  onWSMessageReceived((message: EntityUpdated): void => {
    invalidator.invalidateQueriesByResourceName(message.resourceName);
  });

  return <>{children}</>;
};
