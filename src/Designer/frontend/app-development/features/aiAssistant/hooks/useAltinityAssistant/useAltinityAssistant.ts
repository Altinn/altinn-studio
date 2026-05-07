import { useMemo } from 'react';
import type {
  ChatThread,
  Message,
  UserMessage,
  WorkflowStatus,
  ConnectionStatus,
} from '@studio/assistant';
import { MessageAuthor } from '@studio/assistant';
import { useAltinityThreads } from '../useAltinityThreads/useAltinityThreads';
import { useAltinityWorkflow } from '../useAltinityWorkflow/useAltinityWorkflow';

export interface UseAltinityAssistantResult {
  connectionStatus: ConnectionStatus;
  workflowStatus: WorkflowStatus;
  chatThreads: ChatThread[];
  messages: Message[];
  currentSessionId: string | null;
  onSubmitMessage: (message: UserMessage) => Promise<void>;
  cancelCurrentWorkflow: () => Promise<void>;
  cancelledMessageContent: string | null;
  clearCancelledMessageContent: () => void;
  selectThread: (threadId: string | null) => void;
  clearCurrentSession: () => void;
  deleteThread: (threadId: string) => void;
}

export const useAltinityAssistant = (): UseAltinityAssistantResult => {
  const threads = useAltinityThreads();
  const {
    connectionStatus,
    workflowStatus,
    onSubmitMessage,
    clearCurrentSession,
    cancelCurrentWorkflow,
    cancelledMessageContent,
    clearCancelledMessageContent,
    traceIdsByMessageId,
  } = useAltinityWorkflow(threads);

  const messages = useMemo(
    () => decorateMessagesWithTraceIds(threads.chatMessages, traceIdsByMessageId),
    [threads.chatMessages, traceIdsByMessageId],
  );

  return {
    connectionStatus,
    workflowStatus,
    chatThreads: threads.chatThreads,
    messages,
    currentSessionId: threads.currentSessionId,
    onSubmitMessage,
    cancelCurrentWorkflow,
    cancelledMessageContent,
    clearCancelledMessageContent,
    selectThread: threads.selectThread,
    clearCurrentSession,
    deleteThread: threads.deleteThread,
  };
};

function decorateMessagesWithTraceIds(
  messages: Message[],
  traceIdsByMessageId: Record<string, string>,
): Message[] {
  return messages.map((message) => {
    if (message.role !== MessageAuthor.Assistant || !message.id) return message;
    const traceId = traceIdsByMessageId[message.id];
    return traceId ? { ...message, traceId } : message;
  });
}
