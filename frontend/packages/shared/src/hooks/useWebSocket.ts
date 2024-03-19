import { useEffect, useRef } from 'react';
import { type WSConnector } from 'app-shared/websockets/WSConnector';

type UseWebSocketResult = {
  onWSMessageReceived: <T>(callback: (value: T) => void) => void;
};

type UseWebsocket = {
  webSocketUrl: string;
  webSocketConnector: typeof WSConnector;
};

export const useWebSocket = ({
  webSocketUrl,
  webSocketConnector,
}: UseWebsocket): UseWebSocketResult => {
  const wsConnectionRef = useRef(null);
  useEffect(() => {
    wsConnectionRef.current = webSocketConnector.getInstance(webSocketUrl);
  }, []);

  const onWSMessageReceived = <T>(callback: (message: T) => void): void => {
    wsConnectionRef.current?.onMessageReceived(callback);
  };

  return {
    onWSMessageReceived,
  };
};
