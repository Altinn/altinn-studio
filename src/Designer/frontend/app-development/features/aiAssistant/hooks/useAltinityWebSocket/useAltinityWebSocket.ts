import { useEffect, useRef, useCallback, useState } from 'react';
import type { HubConnection } from '@microsoft/signalr';
import { getHubConnection } from 'app-shared/websockets/getHubConnection';
import { altinityWebSocketHub, altinityAttachmentsUploadPath } from 'app-shared/api/paths';
import type {
  WorkflowEvent,
  WorkflowRequest,
  AgentResponse,
  ConnectionStatus,
} from '@studio/assistant';

const receiveAgentMessage = 'ReceiveAgentMessage';

export interface UseAltinityWebSocketResult {
  connectionStatus: ConnectionStatus;
  startWorkflow: (request: WorkflowRequest) => Promise<AgentResponse>;
  cancelWorkflow: (sessionId: string) => Promise<void>;
  respondToPermission: (sessionId: string, requestId: string, granted: boolean) => Promise<void>;
  registerSession: (org: string, app: string, threadId: string) => Promise<void>;
  onAgentMessage: (callback: (message: WorkflowEvent) => void) => void;
}

// TODO: rename to useAssistantWebSocket.
export const useAltinityWebSocket = (): UseAltinityWebSocketResult => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const messageCallbackRef = useRef<((message: WorkflowEvent) => void) | null>(null);
  const connection = getHubConnection(altinityWebSocketHub());

  useEffect(() => {
    // The connection is shared across mounts, but each mount registers its own
    // handler and removes exactly that one on unmount. SignalR fans out to every
    // registered handler, so mounts never clobber or double-deliver each other.
    const handleAgentMessage = (message: WorkflowEvent) => {
      if (isSessionCreatedNoise(message)) return;
      messageCallbackRef.current?.(message);
    };
    connection.on(receiveAgentMessage, handleAgentMessage);
    setConnectionStatus('connected');

    return () => {
      connection.off(receiveAgentMessage, handleAgentMessage);
      setConnectionStatus('disconnected');
    };
  }, [connection]);

  const onAgentMessage = useCallback((callback: (message: WorkflowEvent) => void) => {
    messageCallbackRef.current = callback;
  }, []);

  const startWorkflow = useCallback(
    (request: WorkflowRequest) => invokeStartWorkflow(connection, request),
    [connection],
  );

  const cancelWorkflow = useCallback(
    async (sessionId: string): Promise<void> => {
      try {
        await connection.invoke('CancelWorkflow', sessionId);
      } catch (error) {
        console.error('Failed to cancel workflow:', error);
        throw error;
      }
    },
    [connection],
  );

  const respondToPermission = useCallback(
    async (sessionId: string, requestId: string, granted: boolean): Promise<void> => {
      try {
        await connection.invoke('RespondToPermission', sessionId, requestId, granted);
      } catch (error) {
        console.error('Failed to respond to permission request:', error);
        throw error;
      }
    },
    [connection],
  );

  const registerSession = useCallback(
    async (org: string, app: string, threadId: string): Promise<void> => {
      try {
        await connection.invoke('RegisterSession', org, app, threadId);
      } catch (error) {
        console.error('Failed to register session:', error);
        throw error;
      }
    },
    [connection],
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

function isSessionCreatedNoise(message: WorkflowEvent): boolean {
  return (
    message.type === 'workflow_status' && message.data?.message?.toLowerCase() === 'session created'
  );
}

async function invokeStartWorkflow(
  connection: HubConnection,
  request: WorkflowRequest,
): Promise<AgentResponse> {
  try {
    const { attachments, ...rest } = request;
    if (!attachments?.length) {
      return await connection.invoke<AgentResponse>('StartWorkflow', rest);
    }

    const attachmentIds = await Promise.all(attachments.map(uploadAttachment));
    return await connection.invoke<AgentResponse>('StartWorkflow', {
      ...rest,
      attachment_ids: attachmentIds,
    });
  } catch (error) {
    console.error('Failed to start workflow:', error);
    throw error;
  }
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
