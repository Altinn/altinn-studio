import { useEffect } from 'react';
import { getHubConnection } from 'app-shared/websockets/getHubConnection';

type UseWebsocket<T> = {
  webSocketUrls: Array<string>;
  methodNames: Array<string>;
  onWSMessageReceived: (message: T) => void;
};

export const useWebSocket = <T>({
  webSocketUrls,
  methodNames,
  onWSMessageReceived,
}: UseWebsocket<T>): void => {
  useEffect(() => {
    const unsubscribers = webSocketUrls.flatMap((webSocketUrl) => {
      const connection = getHubConnection(webSocketUrl);
      return methodNames.map((methodName) => {
        connection.on(methodName, onWSMessageReceived);
        return () => connection.off(methodName, onWSMessageReceived);
      });
    });
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [webSocketUrls, methodNames, onWSMessageReceived]);
};
