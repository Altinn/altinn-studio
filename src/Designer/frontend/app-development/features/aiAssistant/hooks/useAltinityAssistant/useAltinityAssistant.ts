import type {
  ChatThread,
  Message,
  UserMessage,
  WorkflowStatus,
  ConnectionStatus,
} from '@studio/assistant';
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
  } = useAltinityWorkflow(threads);

  return {
    connectionStatus,
    workflowStatus,
    chatThreads: threads.chatThreads,
    messages: threads.chatMessages,
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
