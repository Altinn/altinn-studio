import { useCallback } from 'react';
import type { ChatThread, UserMessage, WorkflowStatus, ConnectionStatus } from '@studio/assistant';
import { useAltinityThreads } from '../useAltinityThreads/useAltinityThreads';
import { useAltinityWorkflow } from '../useAltinityWorkflow/useAltinityWorkflow';

export interface UseAltinityAssistantResult {
  connectionStatus: ConnectionStatus;
  workflowStatus: WorkflowStatus;
  chatThreads: ChatThread[];
  currentSessionId: string | null;
  onSubmitUserMessage: (message: UserMessage) => Promise<void>;
  cancelCurrentWorkflow: () => Promise<void>;
  cancelledMessageContent: string | null;
  clearCancelledMessageContent: () => void;
  selectThread: (threadId: string | null) => void;
  createNewThread: () => void;
  deleteThread: (threadId: string) => void;
}

export const useAltinityAssistant = (): UseAltinityAssistantResult => {
  const threads = useAltinityThreads();
  const {
    connectionStatus,
    workflowStatus,
    onSubmitUserMessage,
    resetWorkflowStatus,
    cancelCurrentWorkflow,
    cancelledMessageContent,
    clearCancelledMessageContent,
  } = useAltinityWorkflow(threads);
  const { createNewThread: createThread } = threads;

  const createNewThread = useCallback(() => {
    createThread();
    resetWorkflowStatus();
  }, [createThread, resetWorkflowStatus]);

  return {
    connectionStatus,
    workflowStatus,
    chatThreads: threads.chatThreads,
    currentSessionId: threads.currentSessionId,
    onSubmitUserMessage,
    cancelCurrentWorkflow,
    cancelledMessageContent,
    clearCancelledMessageContent,
    selectThread: threads.selectThread,
    createNewThread,
    deleteThread: threads.deleteThread,
  };
};
