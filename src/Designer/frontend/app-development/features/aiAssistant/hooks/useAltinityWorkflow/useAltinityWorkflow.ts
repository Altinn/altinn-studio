import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  UserMessage,
  AssistantMessage,
  WorkflowEvent,
  WorkflowStatus,
  AgentResponse,
  ConnectionStatus,
  UserAttachment,
  AssistantMessageData,
} from '@studio/assistant';
import { MessageAuthor } from '@studio/assistant';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useCurrentBranchQuery } from 'app-shared/hooks/queries/useCurrentBranchQuery';
import { useResetRepositoryMutation } from 'app-shared/hooks/mutations/useResetRepositoryMutation';
import { useCheckoutBranchMutation } from 'app-shared/hooks/mutations/useCheckoutBranchMutation';
import { useAltinityWebSocket } from '../useAltinityWebSocket/useAltinityWebSocket';
import type { AltinityThreadState } from '../useAltinityThreads/useAltinityThreads';
import {
  formatRejectionMessage,
  getAssistantMessageContent,
  getAssistantMessageTimestamp,
  shouldSkipBranchOps,
} from '../../utils/messageUtils';

const INITIAL_WORKFLOW_MESSAGE = 'Jobber med saken...';
const DEFAULT_WORKFLOW_WAIT_MESSAGE = 'Vent litt...';
const WORKFLOW_ERROR_MESSAGE =
  'Beklager, noe gikk galt under behandlingen av forespørselen din. Vennligst prøv igjen.';

export interface UseAltinityWorkflowResult {
  connectionStatus: ConnectionStatus;
  workflowStatus: WorkflowStatus;
  onSubmitMessage: (message: UserMessage) => Promise<void>;
  resetWorkflowStatus: () => void;
  cancelCurrentWorkflow: () => Promise<void>;
  cancelledMessageContent: string | null;
  clearCancelledMessageContent: () => void;
}

export const useAltinityWorkflow = (threads: AltinityThreadState): UseAltinityWorkflowResult => {
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>({ isActive: false });
  const [cancelledMessageContent, setCancelledMessageContent] = useState<string | null>(null);
  const {
    connectionStatus,
    sessionId: backendSessionId,
    startWorkflow,
    cancelWorkflow,
    onAgentMessage,
  } = useAltinityWebSocket();
  const { org, app } = useStudioEnvironmentParams();
  const { data: currentBranchInfo } = useCurrentBranchQuery(org, app);
  const { mutate: resetRepository } = useResetRepositoryMutation(org, app);
  const { mutate: checkoutBranch } = useCheckoutBranchMutation(org, app);
  const currentBranch = currentBranchInfo?.branchName;
  const currentBranchRef = useRef<string>('main');
  const backendSessionIdRef = useRef<string | null>(backendSessionId);

  const {
    currentSessionId,
    currentSessionIdRef,
    setCurrentSession,
    persistMessage,
    removeLastUserMessage,
  } = threads;

  useEffect(() => {
    backendSessionIdRef.current = backendSessionId;
  }, [backendSessionId]);

  useEffect(() => {
    if (currentBranch) {
      currentBranchRef.current = currentBranch;
    }
  }, [currentBranch]);

  const resetWorkflowStatus = useCallback(() => {
    setWorkflowStatus({ isActive: false });
  }, []);

  const markWorkflowCompleted = useCallback(
    (assistantMessage: AssistantMessageData, messageTimestamp: Date) => {
      setWorkflowStatus((prev) => ({
        ...prev,
        currentStep: 'Completed',
        message: 'AI agent workflow completed successfully',
        isActive: false,
        lastCompletedAt: messageTimestamp,
        filesChanged: assistantMessage.filesChanged || [],
      }));
    },
    [],
  );

  const applyStatusMessage = useCallback((statusMessage: string) => {
    setWorkflowStatus((prev) => ({ ...prev, message: statusMessage }));
  }, []);

  const resetRepoForSession = useCallback(
    (sessionId: string) => {
      const branch = buildSessionBranch(sessionId);
      resetRepository(undefined, {
        onSuccess: () => {
          checkoutBranch(branch, {
            onSuccess: () => {
              currentBranchRef.current = branch;
            },
          });
        },
      });
    },
    [resetRepository, checkoutBranch],
  );

  const handleAssistantMessage = useCallback(
    (event: WorkflowEvent & { type: 'assistant_message' }) => {
      const assistantMessage = event.data;
      const messageContent = getAssistantMessageContent(assistantMessage);
      const messageTimestamp = getAssistantMessageTimestamp(assistantMessage);
      markWorkflowCompleted(assistantMessage, messageTimestamp);

      if (!event.session_id) return;

      const finalAssistantMessage: AssistantMessage = {
        author: MessageAuthor.Assistant,
        content: messageContent,
        timestamp: messageTimestamp,
        filesChanged: assistantMessage.filesChanged || [],
        sources: assistantMessage.sources || [],
      };
      persistMessage(event.session_id, finalAssistantMessage);

      if (!shouldSkipBranchOps(assistantMessage)) {
        resetRepoForSession(event.session_id);
      }
    },
    [resetRepoForSession, markWorkflowCompleted, persistMessage],
  );

  const handleWorkflowEvent = useCallback(
    (event: WorkflowEvent) => {
      if (event.type === 'assistant_message') {
        handleAssistantMessage(event);
      } else if (event.type === 'status') {
        const isTerminal =
          event.data?.status === 'completed' ||
          event.data?.status === 'failed' ||
          event.data?.done === true;
        if (isTerminal) {
          setWorkflowStatus({ isActive: false });
        } else {
          applyStatusMessage(event.data?.message || DEFAULT_WORKFLOW_WAIT_MESSAGE);
        }
      } else if (event.type === 'workflow_status') {
        applyStatusMessage(event.data.message || DEFAULT_WORKFLOW_WAIT_MESSAGE);
      } else if (event.type === 'error') {
        setWorkflowStatus({ isActive: false });
        if (!event.session_id) return;
        if (event.data?.status === 'cancelled') return;
        const errorMessage: AssistantMessage = {
          author: MessageAuthor.Assistant,
          content: WORKFLOW_ERROR_MESSAGE,
          timestamp: new Date(),
          filesChanged: [],
        };
        persistMessage(event.session_id, errorMessage);
      }
    },
    [applyStatusMessage, handleAssistantMessage, persistMessage],
  );

  useEffect(() => {
    onAgentMessage((event: WorkflowEvent) => {
      const activeBackendSession = backendSessionIdRef.current;

      if (event.session_id && activeBackendSession && event.session_id !== activeBackendSession) {
        return;
      }

      handleWorkflowEvent(event);
    });
  }, [onAgentMessage, handleWorkflowEvent]);

  const startAgentWorkflow = useCallback(
    async (
      threadId: string,
      goal: string,
      allowAppChanges: boolean,
      attachments?: UserAttachment[],
    ): Promise<AgentResponse> => {
      const activeSession = backendSessionIdRef.current;
      if (!activeSession) {
        throw new Error('No active backend session — connection not established');
      }

      setWorkflowStatus({
        isActive: true,
        sessionId: activeSession,
        currentStep: 'Initializing',
        message: INITIAL_WORKFLOW_MESSAGE,
      });

      const branchToUse = currentBranch ?? currentBranchRef.current ?? 'main';

      try {
        const result = await startWorkflow({
          session_id: activeSession,
          goal: goal,
          org: org,
          app: app,
          branch: branchToUse,
          allow_app_changes: allowAppChanges,
          attachments,
        });

        if (!result.accepted) {
          setWorkflowStatus({ isActive: false });
        }

        return result;
      } catch (error) {
        setWorkflowStatus({ isActive: false });
        throw error;
      }
    },
    [app, currentBranch, org, startWorkflow],
  );

  const runWorkflowForSession = useCallback(
    async (threadId: string, userMessage: UserMessage): Promise<void> => {
      persistMessage(threadId, userMessage);

      try {
        const result = await startAgentWorkflow(
          threadId,
          userMessage.content,
          userMessage.allowAppChanges ?? false,
          userMessage.attachments,
        );
        if (!result.accepted) {
          persistMessage(threadId, {
            author: MessageAuthor.Assistant,
            content: formatRejectionMessage(result),
            timestamp: new Date(),
            filesChanged: [],
          });
        }
      } catch (error) {
        console.error('Workflow request failed:', error);
        persistMessage(threadId, {
          author: MessageAuthor.Assistant,
          content: WORKFLOW_ERROR_MESSAGE,
          timestamp: new Date(),
          filesChanged: [],
        });
      }
    },
    [persistMessage, startAgentWorkflow],
  );

  const onSubmitMessage = useCallback(
    async (message: UserMessage): Promise<void> => {
      const trimmedContent = message.content?.trim();
      if (!trimmedContent) return;

      const userMessage: UserMessage = {
        ...message,
        content: trimmedContent,
        timestamp: new Date(),
      };

      if (currentSessionId) {
        await runWorkflowForSession(currentSessionId, userMessage);
        return;
      }

      if (!backendSessionId) {
        console.error('No backend session ID available - connection not established');
        return;
      }

      setCurrentSession(backendSessionId);
      await runWorkflowForSession(backendSessionId, userMessage);
    },
    [backendSessionId, currentSessionId, runWorkflowForSession, setCurrentSession],
  );

  const cancelCurrentWorkflow = useCallback(async (): Promise<void> => {
    const threadId = currentSessionIdRef.current;
    if (!threadId) return;
    setWorkflowStatus({ isActive: false });
    const restoredContent = removeLastUserMessage(threadId);
    if (restoredContent) {
      setCancelledMessageContent(restoredContent);
    }
    const activeSession = backendSessionIdRef.current;
    if (!activeSession) return;
    try {
      await cancelWorkflow(activeSession);
    } catch (error) {
      console.error('Cancel workflow request failed:', error);
    }
  }, [cancelWorkflow, currentSessionIdRef, removeLastUserMessage]);

  const clearCancelledMessageContent = useCallback(() => {
    setCancelledMessageContent(null);
  }, []);

  return {
    connectionStatus,
    workflowStatus,
    onSubmitMessage,
    resetWorkflowStatus,
    cancelCurrentWorkflow,
    cancelledMessageContent,
    clearCancelledMessageContent,
  };
};

function buildSessionBranch(sessionId: string): string {
  const uniqueIdWithoutPrefix = sessionId.startsWith('session_')
    ? sessionId.substring(8, 16)
    : sessionId.substring(0, 8);
  return `altinity_session_${uniqueIdWithoutPrefix}`;
}
