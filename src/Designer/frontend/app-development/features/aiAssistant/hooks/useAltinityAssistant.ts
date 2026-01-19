import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type {
  ChatThread,
  UserMessage,
  AssistantMessage,
  Message,
  WorkflowEvent,
  WorkflowStatus,
  AgentResponse,
  ConnectionStatus,
  UserAttachment,
} from '@studio/assistant';
import { MessageAuthor, ErrorMessages } from '@studio/assistant';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useRepoCurrentBranchQuery } from 'app-shared/hooks/queries/useRepoCurrentBranchQuery';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useThreadStorage } from './useThreadStorage';
import { useAltinityWebSocket } from './useAltinityWebSocket';

export interface UseAltinityAssistantResult {
  // Connection state
  connectionStatus: ConnectionStatus;

  // Workflow state
  workflowStatus: WorkflowStatus;

  // Messages
  chatThreads: ChatThread[];

  // Current session
  currentSessionId: string | null;

  // Actions
  onSubmitMessage: (message: UserMessage) => Promise<void>;
  selectThread: (threadId: string | null) => void;
  createNewThread: () => void;
  deleteThread: (threadId: string) => void;
}

export const useAltinityAssistant = (): UseAltinityAssistantResult => {
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>({ isActive: false });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  const {
    connectionStatus,
    sessionId: backendSessionId,
    startWorkflow,
    onAgentMessage,
  } = useAltinityWebSocket();

  const {
    threads: chatThreads,
    addThread,
    updateThread,
    getThread,
    deleteThread: deleteThreadFromStorage,
  } = useThreadStorage();

  const { org, app } = useStudioEnvironmentParams();
  const queryClient = useQueryClient();
  const { data: currentBranch } = useRepoCurrentBranchQuery(org, app);
  const currentBranchRef = useRef<string>('main');

  useEffect(() => {
    if (currentBranch) {
      currentBranchRef.current = currentBranch;
    }
  }, [currentBranch]);

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    onAgentMessage((event: WorkflowEvent) => {
      const currentSession = currentSessionIdRef.current;

      if (event.session_id && event.session_id !== currentSession) {
        return;
      }

      handleWorkflowEvent(event);
    });
  }, [onAgentMessage]);

  const addMessageToThread = useCallback(
    (threadId: string, message: UserMessage | AssistantMessage) => {
      const existingThread = getThread(threadId);
      if (existingThread) {
        const updatedMessages = [...existingThread.messages, message];
        updateThread(threadId, {
          messages: updatedMessages,
        });
      } else {
        const newThread: ChatThread = {
          id: threadId,
          title:
            message.author === MessageAuthor.User
              ? message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
              : `Session ${threadId}`,
          messages: [message],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        addThread(newThread);
      }
    },
    [addThread, updateThread, getThread],
  );

  const selectThread = useCallback((threadId: string | null) => {
    setCurrentSessionId(threadId);
    currentSessionIdRef.current = threadId;
  }, []);

  const createNewThread = useCallback(() => {
    setCurrentSessionId(null);
    currentSessionIdRef.current = null;
    setWorkflowStatus({ isActive: false });
  }, []);

  const deleteThread = useCallback(
    (threadId: string) => {
      deleteThreadFromStorage(threadId);
      if (currentSessionId === threadId) {
        setCurrentSessionId(null);
        currentSessionIdRef.current = null;
      }
    },
    [deleteThreadFromStorage, currentSessionId],
  );

  const handleWorkflowEvent = useCallback(
    (event: WorkflowEvent) => {
      if (event.type === 'assistant_message') {
        const assistantMessage = event.data;
        const messageContent =
          assistantMessage.response || assistantMessage.message || assistantMessage.content || '';

        const messageTimestamp = new Date(assistantMessage.timestamp || Date.now());

        setWorkflowStatus((prev) => ({
          ...prev,
          currentStep: 'Completed',
          message: 'AI agent workflow completed successfully',
          isActive: false,
          lastCompletedAt: messageTimestamp,
          filesChanged: assistantMessage.filesChanged || [],
        }));

        const currentSession = currentSessionIdRef.current;

        if (currentSession) {
          const existingThread = getThread(currentSession);

          if (existingThread) {
            const lastMessage = existingThread.messages[existingThread.messages.length - 1];

            if (lastMessage && lastMessage.author === MessageAuthor.Assistant) {
              const updatedMessages: Message[] = [
                ...existingThread.messages.slice(0, -1),
                {
                  ...lastMessage,
                  content: messageContent,
                  timestamp: messageTimestamp,
                  filesChanged: assistantMessage.filesChanged || [],
                  sources: assistantMessage.sources || [],
                  isLoading: false,
                } as AssistantMessage,
              ];
              updateThread(currentSession, { messages: updatedMessages });
            } else {
              const updatedMessages: Message[] = [
                ...existingThread.messages,
                {
                  author: MessageAuthor.Assistant,
                  content: messageContent,
                  timestamp: messageTimestamp,
                  filesChanged: assistantMessage.filesChanged || [],
                  sources: assistantMessage.sources || [],
                  isLoading: false,
                } as AssistantMessage,
              ];
              updateThread(currentSession, { messages: updatedMessages });
            }
          }
        }

        const mode = assistantMessage.mode;
        const noBranchOps = assistantMessage.no_branch_operations;
        const shouldSkipBranchOps = mode === 'chat' || noBranchOps === true;

        if (!shouldSkipBranchOps) {
          const sessionId = event.session_id || currentSession;
          if (!sessionId) return;

          const uniqueId = sessionId.startsWith('session_')
            ? sessionId.substring(8, 16)
            : sessionId.substring(0, 8);
          const branch = `altinity_session_${uniqueId}`;

          const resetUrl = `/designer/api/repos/repo/${org}/${app}/reset${branch !== 'main' ? `?branch=${encodeURIComponent(branch)}` : ''}`;
          fetch(resetUrl, {
            method: 'GET',
            credentials: 'same-origin',
          })
            .then(() => {
              console.log('Repository reset completed, triggering preview reload');
              currentBranchRef.current = branch;
              queryClient.invalidateQueries({
                queryKey: [QueryKey.RepoCurrentBranch, org, app],
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
        }
      } else if (event.type === 'workflow_status') {
        if (currentSessionId) {
          const existingThread = chatThreads.find((t) => t.id === currentSessionId);
          if (existingThread) {
            const updatedMessages = existingThread.messages.map((msg, index) => {
              if (
                msg.author === MessageAuthor.Assistant &&
                index === existingThread.messages.length - 1
              ) {
                return {
                  ...msg,
                  content: `${event.data.message || 'Vent litt...'}`,
                };
              }
              return msg;
            });
            updateThread(currentSessionId, { messages: updatedMessages });
          }
        }
      }
    },
    [currentSessionId, getThread],
  );

  const startAgentWorkflow = async (
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
  };

  const onSubmitMessage = async (message: UserMessage): Promise<void> => {
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
      addMessageToThread(sessionId, userMessage);

      try {
        const result = await startAgentWorkflow(
          sessionId,
          trimmedContent,
          message.allowAppChanges ?? false,
          message.attachments,
        );
        if (!result.accepted) {
          const rejectionMessage: AssistantMessage = {
            author: MessageAuthor.Assistant,
            content: formatRejectionMessage(result),
            timestamp: new Date(),
            filesChanged: [],
          };
          addMessageToThread(sessionId, rejectionMessage);
        }
      } catch (error) {
        console.error('Failed to continue workflow:', error);
        const errorMessage: AssistantMessage = {
          author: MessageAuthor.Assistant,
          content: formatErrorMessage(error),
          timestamp: new Date(),
          filesChanged: [],
        };
        addMessageToThread(sessionId, errorMessage);
      }
    } else {
      if (!backendSessionId) {
        console.error('No backend session ID available - connection not established');
        return;
      }

      sessionId = backendSessionId;
      selectThread(sessionId);

      addMessageToThread(sessionId, userMessage);

      try {
        const result = await startAgentWorkflow(
          sessionId,
          message.content,
          message.allowAppChanges ?? false,
          message.attachments,
        );

        if (result.accepted) {
          // Initial message already added in startAgentWorkflow - don't add another one
        } else {
          // Handle rejection with agent message
          const rejectionMessage: AssistantMessage = {
            author: MessageAuthor.Assistant,
            content: formatRejectionMessage(result),
            timestamp: new Date(),
            filesChanged: [],
          };
          addMessageToThread(sessionId, rejectionMessage);
        }
      } catch (error) {
        console.error('Failed to start workflow:', error);

        // Parse detailed error from backend
        let errorContent = formatErrorMessage(error);

        if (error instanceof Error) {
          try {
            // The error message contains the full response body as a string
            const responseBody = JSON.parse(error.message);
            if (responseBody.detail) {
              const detail = responseBody.detail;
              if (typeof detail === 'string') {
                // Detail is a string like "400: {'message': '...', 'suggestions': [...]}"
                const colonIndex = detail.indexOf(': ');
                if (colonIndex !== -1) {
                  const jsonPart = detail.substring(colonIndex + 2);

                  // Try to extract message and suggestions manually using regex
                  // This handles the case where the JSON has single quotes and nested content
                  const messageMatch = jsonPart.match(/'message':\s*'([^']*)'/);

                  if (messageMatch) {
                    errorContent = `${ErrorMessages.REQUEST_REJECTED}\n\n${messageMatch[1]}`;

                    // For suggestions, we need to handle the array more carefully
                    // Look for the suggestions array and extract each string
                    const suggestionsStart = jsonPart.indexOf("'suggestions':");
                    if (suggestionsStart !== -1) {
                      const arrayStart = jsonPart.indexOf('[', suggestionsStart);
                      const arrayEnd = jsonPart.lastIndexOf(']');
                      if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
                        const arrayContent = jsonPart.substring(arrayStart + 1, arrayEnd);
                        // Split by ',' but be careful about commas within quoted strings
                        const suggestions = [];
                        let current = '';
                        let inQuotes = false;
                        let quoteChar = '';

                        for (let i = 0; i < arrayContent.length; i++) {
                          const char = arrayContent[i];

                          if (!inQuotes && (char === "'" || char === '"')) {
                            inQuotes = true;
                            quoteChar = char;
                          } else if (
                            inQuotes &&
                            char === quoteChar &&
                            arrayContent[i - 1] !== '\\'
                          ) {
                            inQuotes = false;
                            quoteChar = '';
                          } else if (!inQuotes && char === ',') {
                            if (current.trim()) {
                              suggestions.push(
                                current
                                  .trim()
                                  .replace(/^['"]|['"]$/g, '')
                                  .replace(/\\(['"])/g, '$1'),
                              );
                            }
                            current = '';
                            continue;
                          }

                          if (inQuotes || (char !== "'" && char !== '"')) {
                            current += char;
                          }
                        }

                        // Add the last item
                        if (current.trim()) {
                          suggestions.push(
                            current
                              .trim()
                              .replace(/^['"]|['"]$/g, '')
                              .replace(/\\(['"])/g, '$1'),
                          );
                        }

                        if (suggestions.length > 0) {
                          errorContent += `\n\n**Suggestions:**\n${suggestions.map((s: string) => `• ${s}`).join('\n')}`;
                        }
                      }
                    }
                  } else {
                    // Last resort: show the raw detail
                    errorContent = `${ErrorMessages.REQUEST_REJECTED}\n\n${detail}`;
                  }
                }
              }
            }
          } catch (parseError) {
            // If parsing fails, use the original error message
            console.warn('Failed to parse error response:', parseError);
          }

          const errorMessageObj: AssistantMessage = {
            author: MessageAuthor.Assistant,
            content: errorContent,
            timestamp: new Date(),
            filesChanged: [],
          };
          addMessageToThread(sessionId, errorMessageObj);
        }
      }
    }
  };

  return {
    connectionStatus,
    workflowStatus,
    chatThreads,
    currentSessionId,
    onSubmitMessage,
    selectThread,
    createNewThread,
    deleteThread,
  };
};

function formatRejectionMessage(result: AgentResponse): string {
  const suggestions = result.parsed_intent?.suggestions
    ? 'Suggestions:\n' + result.parsed_intent.suggestions.join('\n')
    : '';

  return `${ErrorMessages.REQUEST_REJECTED}\n\n${result.message}\n\n${suggestions}`;
}

function formatErrorMessage(error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : ErrorMessages.UNKNOWN_ERROR;
  return `${ErrorMessages.REQUEST_FAILED}\n\n${errorMessage}`;
}
