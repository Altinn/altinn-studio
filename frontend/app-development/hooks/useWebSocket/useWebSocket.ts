import { useEffect, useRef } from 'react';
import { type WSConnector } from 'app-shared/websockets/WSConnector';

type UseWebSocketResult = {
  onWSMessageReceived: <T>(callback: (value: T) => void) => void;
};

type UseWebsocket = {
  webSocketUrls: Array<string>;
  clientsName: Array<string>;
  webSocketConnector: typeof WSConnector;
};

export const useWebSocket = ({
  webSocketUrls,
  clientsName,
  webSocketConnector,
}: UseWebsocket): UseWebSocketResult => {
  const wsConnectionRef = useRef(null);
  useEffect(() => {
    wsConnectionRef.current = webSocketConnector.getInstance(webSocketUrls, clientsName);
  }, [webSocketConnector, webSocketUrls, clientsName]);

  const onWSMessageReceived = <T>(callback: (message: T) => void): void => {
    wsConnectionRef.current?.onMessageReceived(callback);
  };

  return {
    onWSMessageReceived,
  };
};
