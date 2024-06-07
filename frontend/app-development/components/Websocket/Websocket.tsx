import React, { useEffect } from 'react';
import { useWebSocket } from 'app-shared/hooks/useWebSocket';
import { processEditorWebSocketHub } from 'app-shared/api/paths';
import { WSConnector } from 'app-shared/websockets/WSConnector';
import { SyncError, SyncSuccess, SyncUtils } from '../../utils/syncUtils';
import { toast } from 'react-toastify';
import { SyncSuccessQueriesInvalidator } from 'app-shared/queryInvalidator/SyncSuccessQueriesInvalidator';
import { useQueryClient } from '@tanstack/react-query';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTranslation } from 'react-i18next';
import { useLayoutContext } from '../../contexts/LayoutContext';

enum SyncClientsName {
  FileSyncSuccess = 'FileSyncSuccess',
  FileSyncError = 'FileSyncError',
}

type WebsocketProps = {
  children: React.ReactNode;
};
export const Websocket = ({ children }: WebsocketProps): React.ReactElement => {
  const { t } = useTranslation();
  const { selectedLayoutSetName } = useLayoutContext();
  const { org, app } = useStudioEnvironmentParams();
  const queryClient = useQueryClient();
  const invalidator = SyncSuccessQueriesInvalidator.getInstance(queryClient, org, app);

  useEffect(() => {
    console.log({
      'The selected layout set name we can use in the sockets': selectedLayoutSetName,
    });
  }, [selectedLayoutSetName]);

  const { onWSMessageReceived } = useWebSocket({
    webSocketUrl: processEditorWebSocketHub(),
    clientsName: [SyncClientsName.FileSyncSuccess, SyncClientsName.FileSyncError],
    webSocketConnector: WSConnector,
  });

  onWSMessageReceived<SyncError | SyncSuccess>((message): void => {
    const isErrorMessage = 'errorCode' in message;
    if (isErrorMessage) {
      toast.error(t(SyncUtils.getSyncErrorMessage(message)), { toastId: message.errorCode });
      return;
    }

    const isSuccessMessage = 'source' in message;
    if (isSuccessMessage) {
      // Please extend the "fileNameCacheKeyMap" inside the "SyncSuccessQueriesInvalidator" class. Do not add query-client invalidation directly here.
      invalidator.invalidateQueryByFileName(message.source.name);
    }
  });

  return <div>{children}</div>;
};
