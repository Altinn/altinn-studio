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
  SessionCreated = 'SessionCreated',
  ReceiveAgentMessage = 'ReceiveAgentMessage',
}

export interface UseAltinityWebSocketResult {
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  sessionId: string | null;
  startWorkflow: (request: WorkflowRequest) => Promise<AgentResponse>;
  cancelWorkflow: (sessionId: string) => Promise<void>;
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

    const connection = getAltinitySignalRConnection(wsInstance);
    if (connection) {
      registerSessionCreatedHandler(connection, (receivedSessionId) => {
        setSessionId(receivedSessionId);
        setConnectionStatus('connected');
      });
      registerAgentMessageHandler(connection, messageCallbackRef);
    }

    return () => {
      if (connection) {
        cleanupConnectionHandlers(connection);
      }
      setConnectionStatus('disconnected');
      setSessionId(null);
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

  return {
    connectionStatus,
    sessionId,
    startWorkflow,
    cancelWorkflow,
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
