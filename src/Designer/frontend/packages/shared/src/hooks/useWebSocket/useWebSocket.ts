import { useEffect } from 'react';
import { type WSConnector } from 'app-shared/websockets/WSConnector';

type UseWebsocket<T> = {
  webSocketUrls: Array<string>;
  clientsName: Array<string>;
  webSocketConnector: typeof WSConnector;
  onWSMessageReceived: (message: T) => void;
};

export const useWebSocket = <T>({
  webSocketUrls,
  clientsName,
  webSocketConnector,
  onWSMessageReceived,
}: UseWebsocket<T>): void => {
  useEffect(() => {
    const connector = webSocketConnector.getInstance(webSocketUrls, clientsName);
    return connector.onMessageReceived(onWSMessageReceived);
  }, [webSocketConnector, webSocketUrls, clientsName, onWSMessageReceived]);
};
