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
  UserAttachment,
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

  // Ref to hold the handleWorkflowEvent function for use in WebSocket reconnect
  const handleWorkflowEventRef = useRef<((event: WorkflowEvent) => void) | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        setConnectionStatus('connecting');
        const ws = new WebSocket('ws://localhost:8071/ws');
        wsRef.current = ws;

        ws.onopen = async () => {
          setConnectionStatus('connected');
          setWsConnection(ws);

          // On reconnect/page load, check if there's a session with a loading message
          // This handles the case where user left the page while agent was running
          const currentSession = currentSessionIdRef.current;

          // Check if current thread has a loading assistant message
          let hasLoadingMessage = false;
          if (currentSession) {
            const thread = getThread(currentSession);
            if (thread && thread.messages.length > 0) {
              const lastMessage = thread.messages[thread.messages.length - 1];
              hasLoadingMessage =
                lastMessage.author === MessageAuthor.Assistant &&
                (lastMessage.isLoading === true ||
                  lastMessage.content?.includes('Vent litt') ||
                  lastMessage.content?.includes('...'));
            }
          }

          // Poll status if we have a loading message from a previous session
          // This handles the case where user left the page while agent was running
          if (currentSession && hasLoadingMessage) {
            console.log(
              'WebSocket connected, polling status for session:',
              currentSession,
              'hasLoadingMessage:',
              hasLoadingMessage,
            );
            try {
              const response = await fetch(
                `http://localhost:8071/api/agent/status/${currentSession}`,
              );
              if (response.ok) {
                const status = await response.json();
                console.log('Agent status response:', status);
                if (status.status === 'done') {
                  // Job finished while disconnected - update UI
                  console.log('Agent job completed while disconnected:', status);
                  // Use last_message.content from status endpoint, fallback to data.response
                  const messageContent =
                    status.last_message?.content ||
                    status.data?.response ||
                    'Agent completed while disconnected.';
                  const filesChanged =
                    status.last_message?.filesChanged || status.data?.filesChanged || [];
                  // Create synthetic event matching backend format
                  // Note: Backend sends 'response' field but type expects 'content' - handleWorkflowEvent handles this
                  const syntheticEvent = {
                    type: 'assistant_message',
                    data: {
                      response: messageContent,
                      timestamp: status.completed_at || new Date().toISOString(),
                      filesChanged: filesChanged,
                      sources: status.last_message?.sources || status.data?.sources || [],
                      mode: status.data?.mode,
                      no_branch_operations: status.data?.no_branch_operations,
                    },
                  } as unknown as WorkflowEvent;
                  if (handleWorkflowEventRef.current) {
                    handleWorkflowEventRef.current(syntheticEvent);
                  }
                } else if (status.status === 'running') {
                  console.log('Agent job still running for session:', currentSession);
                  // Set workflow as active since it's still running
                  setWorkflowStatus((prev) => ({ ...prev, isActive: true }));
                } else if (status.status === 'not_found') {
                  // Session not found - agent might have finished long ago or never started
                  console.log('Session not found, clearing loading state');
                  // Clear the loading state by updating the message
                  if (hasLoadingMessage) {
                    const thread = getThread(currentSession);
                    if (thread) {
                      const updatedMessages = thread.messages.map((msg, index) => {
                        if (
                          index === thread.messages.length - 1 &&
                          msg.author === MessageAuthor.Assistant
                        ) {
                          return {
                            ...msg,
                            content: 'Session expired or not found. Please try again.',
                            isLoading: false,
                          };
                        }
                        return msg;
                      });
                      updateThread(currentSession, { messages: updatedMessages });
                    }
                  }
                }
              } else {
                // Non-OK response when checking status: clear loading state with error
                console.warn('Non-OK response when polling agent status:', response.status);
                const thread = getThread(currentSession);
                if (thread) {
                  const updatedMessages = thread.messages.map((msg, index) => {
                    if (
                      index === thread.messages.length - 1 &&
                      msg.author === MessageAuthor.Assistant
                    ) {
                      return {
                        ...msg,
                        content:
                          '⚠️ **AI-agenten stoppet underveis**\n\n' +
                          'Vi klarte ikke å hente status fra AI-agenten.\n\n' +
                          'Prøv å sende meldingen på nytt. Hvis problemet vedvarer, sjekk at Altinity-agenten kjører og at du har nettverksforbindelse.',
                        isLoading: false,
                      };
                    }
                    return msg;
                  });
                  updateThread(currentSession, { messages: updatedMessages });
                }
                setWorkflowStatus((prev) => ({ ...prev, isActive: false }));
              }
            } catch (error) {
              console.warn('Error polling agent status:', error);
              // Network or other error while polling status: clear loading state so UI is not stuck
              const thread = getThread(currentSession);
              if (thread) {
                const updatedMessages = thread.messages.map((msg, index) => {
                  if (
                    index === thread.messages.length - 1 &&
                    msg.author === MessageAuthor.Assistant
                  ) {
                    return {
                      ...msg,
                      content:
                        '⚠️ **Mistet kontakt med AI-agenten**\n\n' +
                        'Vi fikk en feil mens vi hentet status fra AI-agenten.\n\n' +
                        'Prøv å sende meldingen på nytt. Hvis problemet vedvarer, sjekk loggene til Altinity-agenten.',
                      isLoading: false,
                    };
                  }
                  return msg;
                });
                updateThread(currentSession, { messages: updatedMessages });
              }
              setWorkflowStatus((prev) => ({ ...prev, isActive: false }));
            }
          }
        };

        ws.onmessage = (event) => {
          try {
            const agentEvent: WorkflowEvent & { session_id?: string; type: string } = JSON.parse(
              event.data,
            );

            // Log all received WebSocket events for debugging
            console.log('WebSocket received event:', agentEvent.type, agentEvent);

            // Use the latest currentSessionId from a ref to avoid stale closure issues
            const currentSession = currentSessionIdRef.current;

            // Check if this message is for the current session
            if (agentEvent.session_id && agentEvent.session_id !== currentSession) {
              console.log('Ignoring event for different session:', agentEvent.session_id);
              return;
            }

            if (handleWorkflowEventRef.current) {
              handleWorkflowEventRef.current(agentEvent);
            }
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

          // If we had a loading assistant message, clear it so UI is not stuck on "Vent litt..."
          const currentSession = currentSessionIdRef.current;
          if (currentSession) {
            const thread = getThread(currentSession);
            if (thread && thread.messages.length > 0) {
              const lastIndex = thread.messages.length - 1;
              const lastMessage = thread.messages[lastIndex];
              if (
                lastMessage.author === MessageAuthor.Assistant &&
                (lastMessage as any).isLoading
              ) {
                const updatedMessages = thread.messages.map((msg, index) => {
                  if (index === lastIndex) {
                    return {
                      ...msg,
                      content:
                        '⚠️ **Tilkoblingen til AI-agenten feilet**\n\n' +
                        'Meldingen ble ikke fullført.\n\n' +
                        'Prøv gjerne igjen. Hvis det fortsatt skjer, sjekk at Altinity-agenten kjører lokalt og at WebSocket-tilkoblingen (port 8071) er tilgjengelig.',
                      isLoading: false,
                    };
                  }
                  return msg;
                });
                updateThread(currentSession, { messages: updatedMessages });
                setWorkflowStatus((prev) => ({ ...prev, isActive: false }));
              }
            }
          }
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
    // Note: We intentionally don't include workflowStatus.isActive in deps
    // because we use refs to access current values, and we don't want to
    // reconnect the WebSocket when workflow status changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getThread, updateThread]);

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
        const assistantMessage = event.data as any;
        // Backend sends 'response' or 'message' field, but we need 'content' for the frontend
        const messageContent =
          assistantMessage.response || assistantMessage.message || assistantMessage.content || '';

        // Convert backend timestamp (ISO string) to Date - handle null timestamp
        const messageTimestamp = new Date(assistantMessage.timestamp || Date.now());

        // Update workflow status with completion info
        setWorkflowStatus((prev) => ({
          ...prev,
          currentStep: 'Completed',
          message: 'AI agent workflow completed successfully',
          isActive: false,
          lastCompletedAt: messageTimestamp,
          filesChanged: assistantMessage.filesChanged || [],
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
                  content: messageContent,
                  timestamp: messageTimestamp,
                  filesChanged: assistantMessage.filesChanged || [],
                  sources: assistantMessage.sources || [],
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
                  content: messageContent,
                  timestamp: messageTimestamp,
                  filesChanged: assistantMessage.filesChanged || [],
                  sources: assistantMessage.sources || [],
                  isLoading: false,
                },
              ];
              updateThread(currentSession, { messages: updatedMessages });
            }
          }
        }

        // Check if we should skip branch operations (chat mode or explicit flag)
        const eventData = event.data as any;
        const mode = eventData.mode;
        const noBranchOps = eventData.no_branch_operations;
        const shouldSkipBranchOps = mode === 'chat' || noBranchOps === true;

        if (!shouldSkipBranchOps) {
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
        }
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
      } else if ((event as any).type === 'status') {
        // Status event from agent, e.g. { done: true, success: false, status: 'failed', message: 'Task completed with issues' }
        const statusData: any = (event as any).data || (event as any);

        // Only treat as final when done === true
        if (statusData?.done) {
          const currentSession = currentSessionIdRef.current;

          // Build a human-friendly summary based on success flag
          const statusSummary = statusData.success
            ? 'AI-agenten fullførte oppgaven.'
            : 'AI-agenten klarte ikke å fullføre oppgaven.';

          const rawMessage: string | undefined = statusData.message;

          const formattedContent = statusData.success
            ? `✅ **Oppgave fullført**\n\n${rawMessage ?? statusSummary}`
            : `❌ **Oppgaven feilet**\n\n${rawMessage ?? statusSummary}\n\n` +
              'Dette kan skyldes en midlertidig feil, ugyldig input eller et problem i agenten.\n\n' +
              'Prøv gjerne igjen. Hvis feilen vedvarer, sjekk loggene til Altinity-agenten for mer informasjon.';

          // Update workflow status to reflect completion (with or without issues)
          setWorkflowStatus((prev) => ({
            ...prev,
            currentStep: 'Completed',
            message:
              rawMessage ||
              (statusData.success
                ? 'AI agent completed successfully'
                : 'AI agent completed with issues'),
            isActive: false,
            lastCompletedAt: new Date(),
          }));

          // Replace the last loading assistant message ("Vent litt...") with the final status message
          if (currentSession) {
            const existingThread = getThread(currentSession);
            if (existingThread && existingThread.messages.length > 0) {
              const lastIndex = existingThread.messages.length - 1;
              const lastMessage = existingThread.messages[lastIndex];

              if (lastMessage && lastMessage.author === MessageAuthor.Assistant) {
                const updatedMessages = existingThread.messages.map((msg, index) => {
                  if (index === lastIndex) {
                    return {
                      ...msg,
                      content: formattedContent,
                      isLoading: false,
                    };
                  }
                  return msg;
                });
                updateThread(currentSession, { messages: updatedMessages });
              }
            }
          }
        }
      } else if ((event as any).type === 'done') {
        // Handle 'done' event - agent has completed
        console.log('Received done event:', event);
        const doneData = (event as any).data || (event as any);

        // Update workflow status
        setWorkflowStatus((prev) => ({
          ...prev,
          currentStep: 'Completed',
          message: doneData.success
            ? 'AI agent completed successfully'
            : 'AI agent completed with errors',
          isActive: false,
          lastCompletedAt: new Date(doneData.completed_at || Date.now()),
        }));

        // If there's response data, update the assistant message
        const currentSession = currentSessionIdRef.current;
        if (currentSession && doneData.data?.response) {
          const existingThread = getThread(currentSession);
          if (existingThread) {
            const lastMessage = existingThread.messages[existingThread.messages.length - 1];
            if (lastMessage && lastMessage.author === MessageAuthor.Assistant) {
              const updatedMessages = [
                ...existingThread.messages.slice(0, -1),
                {
                  ...lastMessage,
                  content: doneData.data.response,
                  timestamp: new Date(doneData.completed_at || Date.now()),
                  filesChanged: doneData.data.filesChanged || [],
                  sources: doneData.data.sources || [],
                  isLoading: false,
                },
              ];
              updateThread(currentSession, { messages: updatedMessages });
            }
          }
        }
      }
    },
    [currentSessionId, getThread],
  );

  // Keep the ref in sync with handleWorkflowEvent
  useEffect(() => {
    handleWorkflowEventRef.current = handleWorkflowEvent;
  }, [handleWorkflowEvent]);

  const startAgentWorkflow = async (
    sessionId: string,
    goal: string,
    allowAppChanges: boolean,
    attachments?: UserAttachment[],
  ): Promise<AgentResponse> => {
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
        allow_app_changes: allowAppChanges,
        attachments,
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
        const result = await startAgentWorkflow(
          sessionId,
          trimmedContent,
          message.allowAppChanges ?? false,
          message.attachments,
        );
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
