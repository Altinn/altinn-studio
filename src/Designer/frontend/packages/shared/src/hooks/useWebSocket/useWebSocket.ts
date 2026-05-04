import { useEffect, useRef } from 'react';
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
  const wsConnectionRef = useRef<WSConnector | null>(null);
  useEffect(() => {
    wsConnectionRef.current = webSocketConnector.getInstance(webSocketUrls, clientsName);
    wsConnectionRef.current?.onMessageReceived(onWSMessageReceived);
  }, [webSocketConnector, webSocketUrls, clientsName, onWSMessageReceived]);
};
