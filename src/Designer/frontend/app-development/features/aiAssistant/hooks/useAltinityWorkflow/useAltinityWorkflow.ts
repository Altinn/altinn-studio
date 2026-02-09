import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { QueryKey } from 'app-shared/types/QueryKey';
import { useAltinityWebSocket } from '../useAltinityWebSocket/useAltinityWebSocket';
import type { AltinityThreadState } from '../useAltinityThreads/useAltinityThreads';
import {
  formatErrorMessage,
  formatRejectionMessage,
  getAssistantMessageContent,
  getAssistantMessageTimestamp,
  parseBackendErrorContent,
  shouldSkipBranchOps,
} from '../../utils/messageUtils';

export interface UseAltinityWorkflowResult {
  connectionStatus: ConnectionStatus;
  workflowStatus: WorkflowStatus;
  onSubmitMessage: (message: UserMessage) => Promise<void>;
  resetWorkflowStatus: () => void;
}

export const useAltinityWorkflow = (threads: AltinityThreadState): UseAltinityWorkflowResult => {
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>({ isActive: false });
  const {
    connectionStatus,
    sessionId: backendSessionId,
    startWorkflow,
    onAgentMessage,
  } = useAltinityWebSocket();
  const { org, app } = useStudioEnvironmentParams();
  const queryClient = useQueryClient();
  const { data: currentBranchInfo } = useCurrentBranchQuery(org, app);
  const currentBranch = currentBranchInfo?.branchName;
  const currentBranchRef = useRef<string>('main');

  const {
    currentSessionId,
    currentSessionIdRef,
    setCurrentSession,
    addMessageToThread,
    upsertAssistantMessage,
    updateWorkflowStatusMessage,
  } = threads;

  useEffect(() => {
    if (currentBranch) {
      currentBranchRef.current = currentBranch;
    }
  }, [currentBranch]);

  const resetWorkflowStatus = useCallback(() => {
    setWorkflowStatus({ isActive: false });
  }, []);

  const updateWorkflowCompletedStatus = useCallback(
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

  const resetRepoForSession = useCallback(
    (sessionId: string) => {
      const branch = buildSessionBranch(sessionId);
      const resetUrl = `/designer/api/repos/repo/${org}/${app}/reset${branch !== 'main' ? `?branch=${encodeURIComponent(branch)}` : ''}`;
      fetch(resetUrl, {
        method: 'GET',
        credentials: 'same-origin',
      })
        .then(() => {
          console.log('Repository reset completed, triggering preview reload');
          currentBranchRef.current = branch;
          queryClient.invalidateQueries({
            queryKey: [QueryKey.CurrentBranch, org, app],
          });
          window.dispatchEvent(
            new CustomEvent('altinity-repo-reset', {
              detail: { branch, sessionId },
            }),
          );
        })
        .catch((error) => {
          console.warn('Failed to reset repository:', error);
        });
    },
    [app, org, queryClient],
  );

  const handleAssistantMessage = useCallback(
    (event: WorkflowEvent & { type: 'assistant_message' }) => {
      const assistantMessage = event.data;
      const messageContent = getAssistantMessageContent(assistantMessage);
      const messageTimestamp = getAssistantMessageTimestamp(assistantMessage);
      updateWorkflowCompletedStatus(assistantMessage, messageTimestamp);

      const currentSession = currentSessionIdRef.current;

      if (currentSession) {
        upsertAssistantMessage(currentSession, assistantMessage, messageContent, messageTimestamp);
      }

      if (!shouldSkipBranchOps(assistantMessage)) {
        const sessionId = event.session_id || currentSession;
        if (!sessionId) return;

        resetRepoForSession(sessionId);
      }
    },
    [
      currentSessionIdRef,
      resetRepoForSession,
      updateWorkflowCompletedStatus,
      upsertAssistantMessage,
    ],
  );

  const handleWorkflowEvent = useCallback(
    (event: WorkflowEvent) => {
      if (event.type === 'assistant_message') {
        handleAssistantMessage(event);
      } else if (event.type === 'workflow_status') {
        if (currentSessionId) {
          updateWorkflowStatusMessage(currentSessionId, event.data.message || 'Vent litt...');
        }
      }
    },
    [currentSessionId, handleAssistantMessage, updateWorkflowStatusMessage],
  );

  useEffect(() => {
    onAgentMessage((event: WorkflowEvent) => {
      const currentSession = currentSessionIdRef.current;

      if (event.session_id && event.session_id !== currentSession) {
        return;
      }

      handleWorkflowEvent(event);
    });
  }, [onAgentMessage, handleWorkflowEvent, currentSessionIdRef]);

  const addRejectionMessage = useCallback(
    (sessionId: string, result: AgentResponse) => {
      const rejectionMessage: AssistantMessage = {
        author: MessageAuthor.Assistant,
        content: formatRejectionMessage(result),
        timestamp: new Date(),
        filesChanged: [],
      };
      addMessageToThread(sessionId, rejectionMessage);
    },
    [addMessageToThread],
  );

  const addErrorMessage = useCallback(
    (sessionId: string, content: string) => {
      const errorMessage: AssistantMessage = {
        author: MessageAuthor.Assistant,
        content,
        timestamp: new Date(),
        filesChanged: [],
      };
      addMessageToThread(sessionId, errorMessage);
    },
    [addMessageToThread],
  );

  const handleWorkflowResult = useCallback(
    (sessionId: string, result: AgentResponse) => {
      if (!result.accepted) {
        addRejectionMessage(sessionId, result);
      }
    },
    [addRejectionMessage],
  );

  const startAgentWorkflow = useCallback(
    async (
      sessionId: string,
      goal: string,
      allowAppChanges: boolean,
      attachments?: UserAttachment[],
    ): Promise<AgentResponse> => {
      const branchToUse = currentBranch ?? currentBranchRef.current ?? 'main';

      const result = await startWorkflow({
        session_id: sessionId,
        goal: goal,
        org: org,
        app: app,
        branch: branchToUse,
        allow_app_changes: allowAppChanges,
        attachments,
      });

      if (result.accepted) {
        const initialAgentMessage: AssistantMessage = {
          author: MessageAuthor.Assistant,
          content: `\n\nVent litt...`,
          timestamp: new Date(),
          filesChanged: [],
          isLoading: true,
        };
        addMessageToThread(sessionId, initialAgentMessage);

        setWorkflowStatus({
          isActive: true,
          sessionId: sessionId,
          currentStep: 'Initializing',
          message: 'Starter AI agent workflow...',
        });
      }

      return result;
    },
    [addMessageToThread, app, currentBranch, org, startWorkflow],
  );

  const runWorkflowForSession = useCallback(
    async (
      sessionId: string,
      userMessage: UserMessage,
      onError: (error: unknown) => void,
      errorContext: string,
    ): Promise<void> => {
      addMessageToThread(sessionId, userMessage);

      try {
        const result = await startAgentWorkflow(
          sessionId,
          userMessage.content,
          userMessage.allowAppChanges ?? false,
          userMessage.attachments,
        );
        handleWorkflowResult(sessionId, result);
      } catch (error) {
        console.error(errorContext, error);
        onError(error);
      }
    },
    [addMessageToThread, handleWorkflowResult, startAgentWorkflow],
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

      let sessionId: string;

      if (currentSessionId) {
        sessionId = currentSessionId;
        await runWorkflowForSession(
          sessionId,
          userMessage,
          (error) => addErrorMessage(sessionId, formatErrorMessage(error)),
          'Failed to continue workflow:',
        );
        return;
      }

      if (!backendSessionId) {
        console.error('No backend session ID available - connection not established');
        return;
      }

      sessionId = backendSessionId;
      setCurrentSession(sessionId);

      await runWorkflowForSession(
        sessionId,
        userMessage,
        (error) => {
          if (error instanceof Error) {
            addErrorMessage(sessionId, parseBackendErrorContent(error));
          }
        },
        'Failed to start workflow:',
      );
    },
    [addErrorMessage, backendSessionId, currentSessionId, runWorkflowForSession, setCurrentSession],
  );

  return {
    connectionStatus,
    workflowStatus,
    onSubmitMessage,
    resetWorkflowStatus,
  };
};

function buildSessionBranch(sessionId: string): string {
  const uniqueIdWithoutPrefix = sessionId.startsWith('session_')
    ? sessionId.substring(8, 16)
    : sessionId.substring(0, 8);
  return `altinity_session_${uniqueIdWithoutPrefix}`;
}
