import { useEffect, useRef } from 'react';
import { WSConnector } from 'app-shared/websockets/WSConnector';

type UseWebSocketResult = {
  onWSMessageReceived: <T>(callback: (value: T) => void) => void;
};

type UseWebsocket = {
  websocketUrl: string;
  webSocketConnector: typeof WSConnector;
};

export const useWebsocket = ({
  webSocketUrl,
  webSocketConnector,
}: UseWebsocket): UseWebSocketResult => {
  const wsConnectionRef = useRef(null);
  useEffect(() => {
    wsConnectionRef.current = webSocketConnector.getInstance(websocketUrl);
  }, []);

  const onWSMessageReceived = <T>(callback: (message: T) => void): void => {
    wsConnectionRef.current?.onMessageReceived(callback);
  };

  return {
    onWSMessageReceived,
  };
};
