import { useState, useRef, useCallback } from 'react';
import type { ChatThread, UserMessage, AssistantMessage } from '@studio/assistant';
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
  removeLastUserMessage: (threadId: string) => string | null;
  persistMessage: (threadId: string, message: UserMessage | AssistantMessage) => void;
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

  const persistMessage = useCallback(
    (threadId: string, message: UserMessage | AssistantMessage) => {
      const existingThread = getThread(threadId);
      if (existingThread) {
        updateThread(threadId, { messages: [...existingThread.messages, message] });
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

  const removeLastUserMessage = useCallback(
    (threadId: string): string | null => {
      const existingThread = getThread(threadId);
      if (!existingThread) return null;
      const lastUserIndex = existingThread.messages.reduceRight(
        (found, msg, index) => (found === -1 && msg.author === MessageAuthor.User ? index : found),
        -1,
      );
      if (lastUserIndex === -1) return null;
      const content = existingThread.messages[lastUserIndex].content;
      updateThread(threadId, {
        messages: existingThread.messages.filter((_, i) => i !== lastUserIndex),
      });
      return content;
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
    removeLastUserMessage,
    persistMessage,
  };
};
