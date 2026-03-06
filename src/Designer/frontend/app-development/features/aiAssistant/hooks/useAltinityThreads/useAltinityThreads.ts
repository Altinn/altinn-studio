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
  removeLoadingMessage: (threadId: string) => void;
  removeLastUserMessage: (threadId: string) => string | null;
  removeCancelledMessages: (threadId: string) => string | null;
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

  const removeCancelledMessages = useCallback(
    (threadId: string): string | null => {
      const existingThread = getThread(threadId);
      if (!existingThread) return null;

      const messages = existingThread.messages;

      const lastUserIndex = messages.reduceRight(
        (found, msg, index) => (found === -1 && msg.author === MessageAuthor.User ? index : found),
        -1,
      );
      const restoredContent = lastUserIndex !== -1 ? messages[lastUserIndex].content : null;

      const filtered = messages.filter((msg, index) => {
        const isLastLoadingAssistant =
          msg.author === MessageAuthor.Assistant &&
          index === messages.length - 1 &&
          (msg as AssistantMessage).isLoading;
        return index !== lastUserIndex && !isLastLoadingAssistant;
      });

      updateThread(threadId, { messages: filtered });
      return restoredContent;
    },
    [getThread, updateThread],
  );

  const removeLoadingMessage = useCallback(
    (threadId: string) => {
      const existingThread = getThread(threadId);
      if (!existingThread) return;
      const updatedMessages = existingThread.messages.filter(
        (msg, index) =>
          !(
            msg.author === MessageAuthor.Assistant &&
            index === existingThread.messages.length - 1 &&
            (msg as AssistantMessage).isLoading
          ),
      );
      updateThread(threadId, { messages: updatedMessages });
    },
    [getThread, updateThread],
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
    removeLoadingMessage,
    removeLastUserMessage,
    removeCancelledMessages,
    upsertAssistantMessage,
    updateWorkflowStatusMessage,
  };
};
