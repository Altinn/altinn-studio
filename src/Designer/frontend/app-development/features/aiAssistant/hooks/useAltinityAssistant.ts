import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type {
  ChatThread,
  UserMessage,
  AssistantMessage,
  WorkflowEvent,
  WorkflowStatus,
  AgentResponse,
  ConnectionStatus,
} from '@studio/assistant';
import { MessageAuthor } from '@studio/assistant';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useRepoCurrentBranchQuery } from 'app-shared/hooks/queries/useRepoCurrentBranchQuery';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useThreadStorage } from './useThreadStorage';

const generateThreadId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `thread-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

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
  // Altinity integration state
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>({ isActive: false });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);

  // Thread storage for persistence
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

  // Keep the ref in sync with currentSessionId
  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  // Initialize WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        setConnectionStatus('connecting');
        const ws = new WebSocket('ws://localhost:8071/ws');
        wsRef.current = ws;

        ws.onopen = () => {
          setConnectionStatus('connected');
          setWsConnection(ws);
        };

        ws.onmessage = (event) => {
          try {
            const agentEvent: WorkflowEvent & { session_id?: string } = JSON.parse(event.data);

            // Use the latest currentSessionId from a ref to avoid stale closure issues
            const currentSession = currentSessionIdRef.current;

            // Check if this message is for the current session
            if (agentEvent.session_id && agentEvent.session_id !== currentSession) {
              return;
            }

            handleWorkflowEvent(agentEvent);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        ws.onclose = () => {
          setConnectionStatus('disconnected');
          setWsConnection(null);
          // Attempt to reconnect after a delay
          setTimeout(connectWebSocket, 5000);
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setConnectionStatus('error');
        };
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        setConnectionStatus('error');
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const addMessageToThread = useCallback(
    (threadId: string, message: UserMessage | AssistantMessage) => {
      const existingThread = getThread(threadId);
      if (existingThread) {
        // Update existing thread
        const updatedMessages = [...existingThread.messages, message];
        updateThread(threadId, {
          messages: updatedMessages,
        });
      } else {
        // Create new thread
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
    const now = new Date().toISOString();
    const newThreadId = generateThreadId();
    const newThread: ChatThread = {
      id: newThreadId,
      title: 'Ny tråd',
      messages: [],
      createdAt: now,
      updatedAt: now,
    };

    addThread(newThread);
    setCurrentSessionId(newThreadId);
    currentSessionIdRef.current = newThreadId;
    setWorkflowStatus({ isActive: false });
  }, [addThread]);

  const deleteThread = useCallback(
    (threadId: string) => {
      deleteThreadFromStorage(threadId);
      // If the deleted thread was the active one, clear the selection
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

        // Convert backend timestamp (ISO string) to Date - handle null timestamp
        const messageTimestamp = new Date(assistantMessage.timestamp || Date.now());

        // Update workflow status with completion info
        setWorkflowStatus((prev) => ({
          ...prev,
          currentStep: 'Completed',
          message: 'AI agent workflow completed successfully',
          isActive: false,
          lastCompletedAt: messageTimestamp,
          filesChanged: assistantMessage.filesChanged,
        }));

        // Replace or add the assistant message
        const currentSession = currentSessionIdRef.current;

        if (currentSession) {
          const existingThread = getThread(currentSession);

          if (existingThread) {
            // Check if there's already an assistant message at the end
            const lastMessage = existingThread.messages[existingThread.messages.length - 1];

            if (lastMessage && lastMessage.author === MessageAuthor.Assistant) {
              // Replace the existing assistant message (loading or previous)
              const updatedMessages = [
                ...existingThread.messages.slice(0, -1),
                {
                  ...lastMessage,
                  content: assistantMessage.content, // Use the content as-is, don't add files again
                  timestamp: messageTimestamp,
                  filesChanged: assistantMessage.filesChanged,
                  isLoading: false,
                },
              ];
              updateThread(currentSession, { messages: updatedMessages });
            } else {
              // Add the assistant message if there's no assistant message at the end
              const updatedMessages = [
                ...existingThread.messages,
                {
                  author: MessageAuthor.Assistant,
                  content: assistantMessage.content, // Use the content as-is
                  timestamp: messageTimestamp,
                  filesChanged: assistantMessage.filesChanged,
                  isLoading: false,
                },
              ];
              updateThread(currentSession, { messages: updatedMessages });
            }
          } else {
            console.log('No existing thread found for session:', currentSession);
          }
        } else {
          console.log('No current session found');
        }

        // Extract branch name from the session_id (not from message content)
        // Backend logic: altinity_session_{session_id[8:16]}
        const sessionId = (event as any).session_id || currentSession;
        const uniqueId = sessionId.startsWith('session_')
          ? sessionId.substring(8, 16)
          : sessionId.substring(0, 8);
        const branch = `altinity_session_${uniqueId}`;

        // Trigger repo reset to reclone the repository to dev location with the new branch
        const resetUrl = `/designer/api/repos/repo/${org}/${app}/reset${branch !== 'main' ? `?branch=${encodeURIComponent(branch)}` : ''}`;
        fetch(resetUrl, {
          method: 'GET',
          credentials: 'same-origin',
        })
          .then(() => {
            // Trigger preview reload after successful reset
            console.log('Repository reset completed, triggering preview reload');
            currentBranchRef.current = branch;
            queryClient.invalidateQueries({
              queryKey: [QueryKey.RepoCurrentBranch, org, app],
            });
            // Dispatch custom event that preview components can listen for
            window.dispatchEvent(
              new CustomEvent('altinity-repo-reset', {
                detail: { branch, sessionId },
              }),
            );
          })
          .catch((error) => {
            console.warn('Failed to reset repository:', error);
          });
      } else if (event.type === 'workflow_status') {
        // Handle workflow status updates by updating the existing assistant message
        if (currentSessionId) {
          const existingThread = chatThreads.find((t) => t.id === currentSessionId);
          if (existingThread) {
            // Find the last assistant message and update it with status
            const updatedMessages = existingThread.messages.map((msg, index) => {
              if (
                msg.author === MessageAuthor.Assistant &&
                index === existingThread.messages.length - 1
              ) {
                // Update the last assistant message with current status
                return {
                  ...msg,
                  content: `${(event as any).message || 'Vent litt...'}`,
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
  const startAgentWorkflow = async (sessionId: string, goal: string): Promise<AgentResponse> => {
    const branchToUse = currentBranch ?? currentBranchRef.current ?? 'main';
    const response = await fetch('http://localhost:8071/api/agent/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        goal: goal,
        repo_url: `http://studio.localhost/repos/${org}/${app}.git`,
        branch: branchToUse,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Throw the full error data so the caller can parse it
      throw new Error(JSON.stringify(errorData));
    }

    const result: AgentResponse = await response.json();

    if (result.accepted) {
      // Add initial agent response with loading indicator
      const initialAgentMessage: AssistantMessage = {
        author: MessageAuthor.Assistant,
        content: `\n\nVent litt...`,
        timestamp: new Date(),
        filesChanged: [],
        isLoading: true,
      };
      addMessageToThread(sessionId, initialAgentMessage);

      // Register for WebSocket events for this session
      const registerSession = () => {
        if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
          wsConnection.send(
            JSON.stringify({
              type: 'session',
              session_id: sessionId,
            }),
          );
        } else {
          console.log('WebSocket not ready for session registration, retrying in 200ms');
          setTimeout(registerSession, 200);
        }
      };
      registerSession();

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

    // Always add user message first
    const userMessage: UserMessage = {
      ...message,
      content: trimmedContent,
      timestamp: new Date(),
    };

    let sessionId: string;

    if (currentSessionId) {
      // Continue with existing session
      sessionId = currentSessionId;
      addMessageToThread(sessionId, userMessage);

      try {
        const result = await startAgentWorkflow(sessionId, trimmedContent);
        if (!result.accepted) {
          const rejectionMessage: AssistantMessage = {
            author: MessageAuthor.Assistant,
            content: `❌ **Request Rejected**\n\n${result.message}\n\n${result.parsed_intent?.suggestions ? 'Suggestions:\n' + result.parsed_intent.suggestions.join('\n') : ''}`,
            timestamp: new Date(),
            filesChanged: [],
          };
          addMessageToThread(sessionId, rejectionMessage);
        }
      } catch (error) {
        console.error('Failed to continue workflow:', error);
        const errorMessage: AssistantMessage = {
          author: MessageAuthor.Assistant,
          content: `❌ **Request Failed**\n\n${error instanceof Error ? error.message : 'Unknown error occurred'}`,
          timestamp: new Date(),
          filesChanged: [],
        };
        addMessageToThread(sessionId, errorMessage);
      }
    } else {
      // Create new session for new thread
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      selectThread(sessionId);

      // Add user message to the new thread
      addMessageToThread(sessionId, userMessage);

      try {
        const result = await startAgentWorkflow(sessionId, message.content);

        if (result.accepted) {
          // Initial message already added in startAgentWorkflow - don't add another one
        } else {
          // Handle rejection with agent message
          const rejectionMessage: AssistantMessage = {
            author: MessageAuthor.Assistant,
            content: `❌ **Request Rejected**\n\n${result.message}\n\n${result.parsed_intent?.suggestions ? 'Suggestions:\n' + result.parsed_intent.suggestions.join('\n') : ''}`,
            timestamp: new Date(),
            filesChanged: [],
          };
          addMessageToThread(sessionId, rejectionMessage);
        }
      } catch (error) {
        console.error('Failed to start workflow:', error);

        // Parse detailed error from backend
        let errorContent = `❌ **Request Rejected**\n\n${error instanceof Error ? error.message : 'Unknown error occurred'}`;

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
                    errorContent = `❌ **Request Rejected**\n\n${messageMatch[1]}`;

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
                    errorContent = `❌ **Request Rejected**\n\n${detail}`;
                  }
                }
              }
            }
          } catch (parseError) {
            // If parsing fails, use the original error message
            console.warn('Failed to parse error response:', parseError);
          }

          const errorMessage: AssistantMessage = {
            author: MessageAuthor.Assistant,
            content: errorContent,
            timestamp: new Date(),
            filesChanged: [],
          };
          addMessageToThread(sessionId, errorMessage);
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
