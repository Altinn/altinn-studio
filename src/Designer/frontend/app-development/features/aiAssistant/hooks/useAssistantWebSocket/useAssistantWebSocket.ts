import { useEffect, useRef, useCallback, useState } from 'react';
import { WSConnector } from 'app-shared/websockets/WSConnector';
import { assistantWebSocketHub } from 'app-shared/api/paths';
import type { WorkflowEvent, ConnectionStatus } from '@studio/assistant';

const ASSISTANT_CONNECTION_INDEX = 0; // WSConnector uses single connection for assistant hub

enum AssistantClientsName {
  ReceiveAgentMessage = 'ReceiveAgentMessage',
}

// The hub only pushes the assistant's events. The browser sends its commands over HTTP.
export interface UseAssistantWebSocketResult {
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  onAgentMessage: (callback: (message: WorkflowEvent) => void) => void;
}

export const useAssistantWebSocket = (): UseAssistantWebSocketResult => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const wsInstanceRef = useRef<any>(null);
  const messageCallbackRef = useRef<((message: WorkflowEvent) => void) | null>(null);

  useEffect(() => {
    // One shared connection per browser tab (WSConnector.getInstance is keyed by hub URL).
    const wsInstance = WSConnector.getInstance(
      [assistantWebSocketHub()],
      [AssistantClientsName.ReceiveAgentMessage],
    );
    wsInstanceRef.current = wsInstance;

    const connection = getAssistantSignalRConnection(wsInstance);
    if (!connection) return undefined;

    ensureAgentMessageDispatcher(connection);
    ensureConnectionStatusTracker(connection);
    const subscriber = (message: WorkflowEvent) => messageCallbackRef.current?.(message);
    agentMessageSubscribers.add(subscriber);
    connectionStatusSubscribers.add(setConnectionStatus);
    setConnectionStatus(readConnectionStatus(connection));
    // The initial start fires no lifecycle callback, so settle the status once it resolves.
    wsInstance
      .whenStarted?.()
      .then(() => publishConnectionStatus(readConnectionStatus(connection)));

    return () => {
      agentMessageSubscribers.delete(subscriber);
      connectionStatusSubscribers.delete(setConnectionStatus);
    };
  }, []);

  const onAgentMessage = useCallback((callback: (message: WorkflowEvent) => void) => {
    messageCallbackRef.current = callback;
  }, []);

  return {
    connectionStatus,
    onAgentMessage,
  };
};

function getAssistantSignalRConnection(wsInstance: any): any | null {
  if (!wsInstance) return null;

  const connections = wsInstance.connections;
  if (!connections || connections.length === 0) return null;

  return connections[ASSISTANT_CONNECTION_INDEX];
}

const agentMessageSubscribers = new Set<(message: WorkflowEvent) => void>();
const dispatchedConnections = new WeakSet<object>();
const connectionStatusSubscribers = new Set<(status: ConnectionStatus) => void>();
const statusTrackedConnections = new WeakSet<object>();

function readConnectionStatus(connection: any): ConnectionStatus {
  switch (connection?.state) {
    case 'Connected':
      return 'connected';
    case 'Connecting':
    case 'Reconnecting':
      return 'connecting';
    default:
      return 'disconnected';
  }
}

function publishConnectionStatus(status: ConnectionStatus): void {
  connectionStatusSubscribers.forEach((subscriber) => subscriber(status));
}

// SignalR cannot detach onclose/onreconnecting, so register once per connection.
function ensureConnectionStatusTracker(connection: any): void {
  if (statusTrackedConnections.has(connection)) return;
  statusTrackedConnections.add(connection);

  connection.onreconnecting?.(() => publishConnectionStatus('connecting'));
  connection.onreconnected?.(() => publishConnectionStatus('connected'));
  connection.onclose?.((error?: Error) =>
    publishConnectionStatus(error ? 'error' : 'disconnected'),
  );
}

function ensureAgentMessageDispatcher(connection: any): void {
  if (dispatchedConnections.has(connection)) return;
  dispatchedConnections.add(connection);

  connection.on(AssistantClientsName.ReceiveAgentMessage, (message: WorkflowEvent) => {
    if (
      message.type === 'workflow_status' &&
      message.data?.message?.toLowerCase() === 'session created'
    ) {
      return;
    }

    agentMessageSubscribers.forEach((subscriber) => {
      try {
        subscriber(message);
      } catch (error) {
        // One failing subscriber must not block delivery to the others.
        console.error('Assistant agent message subscriber failed:', error);
      }
    });
  });
}
