import { useEffect, useRef, useCallback, useState } from 'react';
import { WSConnector } from 'app-shared/websockets/WSConnector';
import { altinityWebSocketHub, altinityAttachmentsUploadPath } from 'app-shared/api/paths';
import type {
  WorkflowEvent,
  WorkflowRequest,
  AgentResponse,
  ConnectionStatus,
} from '@studio/assistant';

const ALTINITY_CONNECTION_INDEX = 0; // WSConnector uses single connection for Altinity hub

enum AltinityClientsName {
  ReceiveAgentMessage = 'ReceiveAgentMessage',
}

export interface UseAltinityWebSocketResult {
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  startWorkflow: (request: WorkflowRequest) => Promise<AgentResponse>;
  cancelWorkflow: (sessionId: string) => Promise<void>;
  respondToPermission: (sessionId: string, requestId: string, granted: boolean) => Promise<void>;
  registerSession: (org: string, app: string, threadId: string) => Promise<void>;
  onAgentMessage: (callback: (message: WorkflowEvent) => void) => void;
}

// TODO: rename to useAssistantWebSocket.
export const useAltinityWebSocket = (): UseAltinityWebSocketResult => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const wsInstanceRef = useRef<any>(null);
  const messageCallbackRef = useRef<((message: WorkflowEvent) => void) | null>(null);

  useEffect(() => {
    // One shared connection per browser tab (WSConnector.getInstance is keyed
    // by hub URL). Creating a connection per mount leaked the previous one on
    // every remount and, with a live handler still attached (e.g. during HMR),
    // delivered every agent event twice — duplicate assistant bubbles.
    const wsInstance = WSConnector.getInstance(
      [altinityWebSocketHub()],
      [AltinityClientsName.ReceiveAgentMessage],
    );
    wsInstanceRef.current = wsInstance;

    const connection = getAltinitySignalRConnection(wsInstance);
    if (!connection) return undefined;

    ensureAgentMessageDispatcher(connection);
    const subscriber = (message: WorkflowEvent) => messageCallbackRef.current?.(message);
    agentMessageSubscribers.add(subscriber);
    setConnectionStatus('connected');

    return () => {
      // Remove only this mount's subscriber — the connection and its single
      // dispatcher stay alive for the next mount (and for other subscribers).
      agentMessageSubscribers.delete(subscriber);
      setConnectionStatus('disconnected');
    };
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

  const cancelWorkflow = useCallback(async (cancelSessionId: string): Promise<void> => {
    const connection = getAltinitySignalRConnection(wsInstanceRef.current);
    if (!connection) {
      throw new Error('No active SignalR connection to Altinity hub');
    }

    try {
      await connection.invoke('CancelWorkflow', cancelSessionId);
    } catch (error) {
      console.error('Failed to cancel workflow:', error);
      throw error;
    }
  }, []);

  const respondToPermission = useCallback(
    async (sessionId: string, requestId: string, granted: boolean): Promise<void> => {
      const connection = getAltinitySignalRConnection(wsInstanceRef.current);
      if (!connection) {
        throw new Error('No active SignalR connection to Altinity hub');
      }

      try {
        await connection.invoke('RespondToPermission', sessionId, requestId, granted);
      } catch (error) {
        console.error('Failed to respond to permission request:', error);
        throw error;
      }
    },
    [],
  );

  const registerSession = useCallback(
    async (org: string, app: string, threadId: string): Promise<void> => {
      const connection = getAltinitySignalRConnection(wsInstanceRef.current);
      if (!connection) {
        throw new Error('No active SignalR connection to Altinity hub');
      }

      try {
        await connection.invoke('RegisterSession', org, app, threadId);
      } catch (error) {
        console.error('Failed to register session:', error);
        throw error;
      }
    },
    [],
  );

  return {
    connectionStatus,
    startWorkflow,
    cancelWorkflow,
    respondToPermission,
    registerSession,
    onAgentMessage,
  };
};

function getAltinitySignalRConnection(wsInstance: any): any | null {
  if (!wsInstance) return null;

  const connections = wsInstance.connections;
  if (!connections || connections.length === 0) return null;

  return connections[ALTINITY_CONNECTION_INDEX];
}

// Module-level fan-out: the shared connection gets exactly ONE SignalR handler
// (registered once per connection), which dispatches to the current mounts'
// subscribers. Mount/unmount only touches the subscriber set — it never calls
// connection.off, which would silently drop every other mount's handler.
const agentMessageSubscribers = new Set<(message: WorkflowEvent) => void>();
const dispatchedConnections = new WeakSet<object>();

function ensureAgentMessageDispatcher(connection: any): void {
  if (dispatchedConnections.has(connection)) return;
  dispatchedConnections.add(connection);

  connection.on(AltinityClientsName.ReceiveAgentMessage, (message: WorkflowEvent) => {
    if (
      message.type === 'workflow_status' &&
      message.data?.message?.toLowerCase() === 'session created'
    ) {
      return;
    }

    agentMessageSubscribers.forEach((subscriber) => subscriber(message));
  });
}

async function uploadAttachment(file: {
  name: string;
  mimeType: string;
  dataBase64: string;
}): Promise<string> {
  const base64Data = file.dataBase64.includes(',')
    ? file.dataBase64.split(',')[1]
    : file.dataBase64;
  const byteCharacters = atob(base64Data);
  const byteArray = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i);
  }
  const blob = new Blob([byteArray], { type: file.mimeType });

  const formData = new FormData();
  formData.append('file', blob, file.name);

  const { post } = await import('app-shared/utils/networking');
  const result = await post<{ attachmentId: string }, FormData>(
    altinityAttachmentsUploadPath(),
    formData,
  );
  return result!.attachmentId;
}

async function invokeStartWorkflowOnServer(
  connection: any,
  request: WorkflowRequest,
): Promise<AgentResponse> {
  try {
    const { attachments, ...rest } = request;

    let signalRRequest: Omit<WorkflowRequest, 'attachments'> & { attachment_ids?: string[] } = rest;

    if (attachments && attachments.length > 0) {
      const attachmentIds = await Promise.all(attachments.map(uploadAttachment));
      signalRRequest = { ...rest, attachment_ids: attachmentIds };
    }

    const result: AgentResponse = await connection.invoke('StartWorkflow', signalRRequest);
    return result;
  } catch (error) {
    console.error('Failed to start workflow:', error);
    throw error;
  }
}
