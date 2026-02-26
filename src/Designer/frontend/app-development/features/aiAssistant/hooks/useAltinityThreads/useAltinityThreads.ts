import { useState, useRef, useCallback } from 'react';
import type {
  ChatThread,
  UserMessage,
  AssistantMessage,
  AssistantMessageData,
} from '@studio/assistant';
import { MessageAuthor } from '@studio/assistant';
import type { MutableRefObject } from 'react';
import { useThreadStorage } from '../useThreadStorage/useThreadStorage';

export interface AltinityThreadState {
  chatThreads: ChatThread[];
  currentSessionId: string | null;
  currentSessionIdRef: MutableRefObject<string | null>;
  setCurrentSession: (sessionId: string | null) => void;
  selectThread: (threadId: string | null) => void;
  createNewThread: () => void;
  deleteThread: (threadId: string) => void;
  addMessageToThread: (threadId: string, message: UserMessage | AssistantMessage) => void;
  upsertAssistantMessage: (
    sessionId: string,
    assistantMessage: AssistantMessageData,
    content: string,
    timestamp: Date,
  ) => void;
  updateWorkflowStatusMessage: (sessionId: string, statusMessage: string) => void;
}

export const useAltinityThreads = (): AltinityThreadState => {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  const {
    threads: chatThreads,
    addThread,
    updateThread,
    getThread,
    deleteThread: deleteThreadFromStorage,
  } = useThreadStorage();

  const setCurrentSession = useCallback((sessionId: string | null) => {
    setCurrentSessionId(sessionId);
    currentSessionIdRef.current = sessionId;
  }, []);

  const selectThread = useCallback(
    (threadId: string | null) => {
      setCurrentSession(threadId);
    },
    [setCurrentSession],
  );

  const createNewThread = useCallback(() => {
    setCurrentSession(null);
  }, [setCurrentSession]);

  const deleteThread = useCallback(
    (threadId: string) => {
      deleteThreadFromStorage(threadId);
      if (currentSessionIdRef.current === threadId) {
        setCurrentSession(null);
      }
    },
    [deleteThreadFromStorage, setCurrentSession],
  );

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

  const upsertAssistantMessage = useCallback(
    (
      sessionId: string,
      assistantMessage: AssistantMessageData,
      content: string,
      timestamp: Date,
    ) => {
      const existingThread = getThread(sessionId);
      if (!existingThread) return;

      const lastMessage = existingThread.messages[existingThread.messages.length - 1];
      const assistantUpdate: AssistantMessage = {
        author: MessageAuthor.Assistant,
        content,
        timestamp,
        filesChanged: assistantMessage.filesChanged || [],
        sources: assistantMessage.sources || [],
        isLoading: false,
      };
      const updatedMessages =
        lastMessage && lastMessage.author === MessageAuthor.Assistant
          ? [...existingThread.messages.slice(0, -1), { ...lastMessage, ...assistantUpdate }]
          : [...existingThread.messages, assistantUpdate];
      updateThread(sessionId, { messages: updatedMessages });
    },
    [getThread, updateThread],
  );

  const updateWorkflowStatusMessage = useCallback(
    (sessionId: string, statusMessage: string) => {
      const existingThread = getThread(sessionId);
      if (!existingThread) return;

      const updatedMessages = existingThread.messages.map((msg, index) => {
        if (
          msg.author === MessageAuthor.Assistant &&
          index === existingThread.messages.length - 1
        ) {
          return { ...msg, content: `${statusMessage}` };
        }
        return msg;
      });
      updateThread(sessionId, { messages: updatedMessages });
    },
    [getThread, updateThread],
  );

  return {
    chatThreads,
    currentSessionId,
    currentSessionIdRef,
    setCurrentSession,
    selectThread,
    createNewThread,
    deleteThread,
    addMessageToThread,
    upsertAssistantMessage,
    updateWorkflowStatusMessage,
  };
};
