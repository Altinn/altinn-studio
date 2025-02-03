import type { ReactElement } from 'react';
import React, { useEffect } from 'react';
import { useWebSocket } from 'app-development/hooks/useWebSocket';
import { WSConnector } from 'app-shared/websockets/WSConnector';
import { toast } from 'react-toastify';
import { SyncSuccessQueriesInvalidator } from 'app-shared/queryInvalidator/SyncSuccessQueriesInvalidator';
import { useQueryClient } from '@tanstack/react-query';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTranslation } from 'react-i18next';
import type { SyncError, SyncSuccess } from 'app-shared/types/api/SyncResponses';
import { SyncUtils } from 'app-shared/utils/SyncUtils.ts';
import { syncEntityUpdateWebSocketHub, syncEventsWebSocketHub } from 'app-shared/api/paths';
import { useLayoutContext } from '../../contexts/LayoutContext';
import type { EntityUpdated } from 'app-shared/types/api/EntityUpdated';
import { EntityUpdatedQueriesInvalidator } from 'app-shared/queryInvalidator/EntityUpdatedQueriesInvalidator';

enum SyncClientsName {
  FileSyncSuccess = 'FileSyncSuccess',
  FileSyncError = 'FileSyncError',
}

enum SyncEntityClientName {
  EntityUpdate = 'EntityUpdate',
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
  const { selectedLayoutSetName } = useLayoutContext();
  const invalidator = SyncSuccessQueriesInvalidator.getInstance(queryClient, org, app);
  const entityUpdateInvalidator = EntityUpdatedQueriesInvalidator.getInstance(
    queryClient,
    org,
    app,
  );

  useEffect(() => {
    invalidator.layoutSetName = selectedLayoutSetName;
  }, [invalidator, selectedLayoutSetName]);

  const { onWSMessageReceived: onFileSyncMessageReceived } = useWebSocket({
    webSocketUrls: [syncEntityUpdateWebSocketHub(), syncEventsWebSocketHub()],
    clientsName: [
      SyncClientsName.FileSyncSuccess,
      SyncClientsName.FileSyncError,
      SyncEntityClientName.EntityUpdate,
    ],
    webSocketConnector: WSConnector,
  });

  onFileSyncMessageReceived<SyncError | SyncSuccess | EntityUpdated>((message): ReactElement => {
    const isEntityUpdate = 'resourceName' in message;
    if (isEntityUpdate) {
      entityUpdateInvalidator.invalidateQueriesByResourceName(message.resourceName);
      return;
    }

    const isErrorMessage = 'errorCode' in message;
    if (isErrorMessage) {
      toast.error(t(SyncUtils.getSyncErrorMessage(message)), { toastId: message.errorCode });
      return;
    }

    const isSuccessMessage = 'source' in message;
    if (isSuccessMessage) {
      // Please extend the "fileNameCacheKeysMap" inside the "SyncSuccessQueriesInvalidator" class. Do not add query-client invalidation directly here.
      invalidator.invalidateQueriesByFileLocation(message.source.name);
    }
  });
  return <>{children}</>;
};
