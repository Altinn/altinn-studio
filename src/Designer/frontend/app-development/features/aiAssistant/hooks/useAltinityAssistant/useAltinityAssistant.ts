import { useCallback } from 'react';
import type { ChatThread, UserMessage, WorkflowStatus, ConnectionStatus } from '@studio/assistant';
import { useAltinityThreads } from '../useAltinityThreads/useAltinityThreads';
import { useAltinityWorkflow } from '../useAltinityWorkflow/useAltinityWorkflow';

export interface UseAltinityAssistantResult {
  connectionStatus: ConnectionStatus;
  workflowStatus: WorkflowStatus;
  chatThreads: ChatThread[];
  currentSessionId: string | null;
  onSubmitMessage: (message: UserMessage) => Promise<void>;
  selectThread: (threadId: string | null) => void;
  createNewThread: () => void;
  deleteThread: (threadId: string) => void;
}

export const useAltinityAssistant = (): UseAltinityAssistantResult => {
  const threads = useAltinityThreads();
  const { connectionStatus, workflowStatus, onSubmitMessage, resetWorkflowStatus } =
    useAltinityWorkflow(threads);
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
    onSubmitMessage,
    selectThread: threads.selectThread,
    createNewThread,
    deleteThread: threads.deleteThread,
  };
};
