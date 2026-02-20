import { useEffect, useRef, useCallback, useState } from 'react';
import { WSConnector } from 'app-shared/websockets/WSConnector';
import { altinityWebSocketHub } from 'app-shared/api/paths';
import type {
  WorkflowEvent,
  WorkflowRequest,
  AgentResponse,
  ConnectionStatus,
} from '@studio/assistant';

const ALTINITY_CONNECTION_INDEX = 0; // WSConnector uses single connection for Altinity hub

enum AltinityClientsName {
  SessionCreated = 'SessionCreated',
  ReceiveAgentMessage = 'ReceiveAgentMessage',
}

export interface UseAltinityWebSocketResult {
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  sessionId: string | null;
  startWorkflow: (request: WorkflowRequest) => Promise<AgentResponse>;
  onAgentMessage: (callback: (message: WorkflowEvent) => void) => void;
}

export const useAltinityWebSocket = (): UseAltinityWebSocketResult => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const wsInstanceRef = useRef<any>(null);
  const messageCallbackRef = useRef<((message: WorkflowEvent) => void) | null>(null);

  useEffect(() => {
    const wsInstance = new WSConnector(
      [altinityWebSocketHub()],
      [AltinityClientsName.SessionCreated, AltinityClientsName.ReceiveAgentMessage],
    );
    wsInstanceRef.current = wsInstance;
    setConnectionStatus('connected');

    return () => {
      setConnectionStatus('disconnected');
    };
  }, []);

  useEffect(() => {
    const connection = getAltinitySignalRConnection(wsInstanceRef.current);
    if (!connection) return;

    registerSessionCreatedHandler(connection, setSessionId);
    registerAgentMessageHandler(connection, messageCallbackRef);

    return () => cleanupConnectionHandlers(connection);
  }, []);

  const onAgentMessage = useCallback((callback: (message: WorkflowEvent) => void) => {
    messageCallbackRef.current = callback;
  }, []);

  const startWorkflow = useCallback(async (request: WorkflowRequest): Promise<AgentResponse> => {
    const connection = getAltinitySignalRConnection(wsInstanceRef.current);
    if (!connection) {
      throw new Error('No active SignalR connection to Altinity hub');
    }

    return await invokeStartWorkflowOnServer(connection, request);
  }, []);

  return {
    connectionStatus,
    sessionId,
    startWorkflow,
    onAgentMessage,
  };
};

function getAltinitySignalRConnection(wsInstance: any): any | null {
  if (!wsInstance) return null;

  const connections = wsInstance.connections;
  if (!connections || connections.length === 0) return null;

  return connections[ALTINITY_CONNECTION_INDEX];
}

function registerSessionCreatedHandler(
  connection: any,
  setSessionId: (sessionId: string) => void,
): void {
  connection.on(AltinityClientsName.SessionCreated, (receivedSessionId: string) => {
    setSessionId(receivedSessionId);
  });
}

function cleanupConnectionHandlers(connection: any): void {
  connection.off(AltinityClientsName.SessionCreated);
  connection.off(AltinityClientsName.ReceiveAgentMessage);
}

function registerAgentMessageHandler(
  connection: any,
  messageCallbackRef: React.MutableRefObject<((message: WorkflowEvent) => void) | null>,
): void {
  connection.on(AltinityClientsName.ReceiveAgentMessage, (message: WorkflowEvent) => {
    if (
      message.type === 'workflow_status' &&
      message.data?.message?.toLowerCase() === 'session created'
    ) {
      return;
    }

    if (messageCallbackRef.current) {
      messageCallbackRef.current(message);
    }
  });
}

async function invokeStartWorkflowOnServer(
  connection: any,
  request: WorkflowRequest,
): Promise<AgentResponse> {
  try {
    const result: AgentResponse = await connection.invoke('StartWorkflow', request);
    return result;
  } catch (error) {
    console.error('Failed to start workflow:', error);
    throw error;
  }
}
