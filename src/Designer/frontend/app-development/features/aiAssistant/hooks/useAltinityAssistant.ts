import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageAuthor } from '@studio/assistant';
import type {
  UserMessage,
  AssistantMessage,
  ChatThread,
  WorkflowEvent,
  WorkflowStatus,
  AgentResponse,
  ConnectionStatus,
} from '@studio/assistant';

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
}

export const useAltinityAssistant = (): UseAltinityAssistantResult => {
  // Altinity integration state
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>({ isActive: false });
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);

  // Real conversation state
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);

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
      setChatThreads((prevThreads) => {
        const threadIndex = prevThreads.findIndex((t) => t.id === threadId);
        if (threadIndex >= 0) {
          // Update existing thread - create completely new thread object
          const existingThread = prevThreads[threadIndex];
          const updatedThread = {
            ...existingThread,
            messages: [...existingThread.messages, message],
            updatedAt: new Date().toISOString(),
          };

          const newThreads = [...prevThreads];
          newThreads[threadIndex] = updatedThread;
          return newThreads;
        } else {
          // Create new thread
          const newThread = {
            id: threadId,
            title: `Session ${threadId}`,
            messages: [message],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return [...prevThreads, newThread];
        }
      });
    },
    [],
  );

  const handleWorkflowEvent = useCallback(
    (event: WorkflowEvent) => {
      if (event.type === 'assistant_message') {
        const assistantMessage = event.data;

        // Convert backend timestamp (ISO string) to Date - handle null timestamp
        const messageTimestamp = new Date(assistantMessage.timestamp || Date.now());

        // Format files changed list if present
        const filesChangedText =
          assistantMessage.filesChanged && assistantMessage.filesChanged.length > 0
            ? `\n\n**Files Modified:**\n${assistantMessage.filesChanged.map((file) => `• ${file}`).join('\n')}`
            : '';

        // Update workflow status with completion info
        setWorkflowStatus((prev) => ({
          ...prev,
          currentStep: 'Completed',
          message: 'AI agent workflow completed successfully',
          isActive: false,
          lastCompletedAt: messageTimestamp,
          filesChanged: assistantMessage.filesChanged,
        }));

        // Replace the existing assistant message (loading message) with completion info
        const currentSession = currentSessionIdRef.current;

        if (currentSession) {
          setChatThreads((prevThreads) => {
            const newThreads = prevThreads.map((thread) => {
              if (thread.id === currentSession) {
                // Find the last assistant message (the loading one) and replace it with completion
                const updatedMessages = thread.messages.map((msg, index) => {
                  if (
                    msg.author === MessageAuthor.Assistant &&
                    index === thread.messages.length - 1
                  ) {
                    // Replace the loading message with the completion message
                    const newMessage = {
                      ...msg,
                      content: `✅ **Task Completed Successfully!**\n\n${assistantMessage.content}${filesChangedText}`,
                      timestamp: messageTimestamp,
                    };
                    return newMessage;
                  }
                  return msg;
                });
                return {
                  ...thread,
                  messages: updatedMessages,
                };
              }
              return thread;
            });
            return newThreads;
          });
        }
      } else if (event.type === 'workflow_status') {
        // Handle workflow status updates by updating the existing assistant message
        if (currentSessionId) {
          setChatThreads((prevThreads) => {
            return prevThreads.map((thread) => {
              if (thread.id === currentSessionId) {
                // Find the last assistant message and update it with status
                const updatedMessages = thread.messages.map((msg, index) => {
                  if (
                    msg.author === MessageAuthor.Assistant &&
                    index === thread.messages.length - 1
                  ) {
                    // Update the last assistant message with current status
                    return {
                      ...msg,
                      content: `${(event as any).message || 'Vent litt...'}`,
                    };
                  }
                  return msg;
                });
                return {
                  ...thread,
                  messages: updatedMessages,
                };
              }
              return thread;
            });
          });
        }
      }
    },
    [currentSessionId, addMessageToThread],
  );

  const startAgentWorkflow = async (sessionId: string, goal: string): Promise<AgentResponse> => {
    const response = await fetch('http://localhost:8071/api/agent/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        goal: goal,
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
    if (!message.content?.trim()) return;

    // Always add user message first
    const userMessage: UserMessage = {
      ...message,
      timestamp: new Date(),
    };

    // Create a session ID for this conversation
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setCurrentSessionId(sessionId);
    currentSessionIdRef.current = sessionId; // Update ref immediately for WebSocket handling

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
                        } else if (inQuotes && char === quoteChar && arrayContent[i - 1] !== '\\') {
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
  };

  return {
    connectionStatus,
    workflowStatus,
    chatThreads,
    currentSessionId,
    onSubmitMessage,
  };
};
