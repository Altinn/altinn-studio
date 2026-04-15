import { useState, useRef, useCallback, useMemo } from 'react';
import type { MutableRefObject } from 'react';
import type { ChatThread, UserMessage, AssistantMessage, Message } from '@studio/assistant';
import { MessageAuthor } from '@studio/assistant';
import { useThreadStorage } from '../useThreadStorage/useThreadStorage';
import { useChatMessagesQuery } from '../queries/useChatMessagesQuery';
import { useCreateChatMessageMutation } from '../mutations/useCreateChatMessageMutation';
import type { ChatMessageResponse } from '../../types/api';

export interface AltinityThreadState {
  chatThreads: ChatThread[];
  currentSessionId: string | null;
  currentSessionIdRef: MutableRefObject<string | null>;
  persistedMessages: Message[];
  setCurrentSession: (sessionId: string | null) => void;
  selectThread: (threadId: string | null) => void;
  createNewThread: () => void;
  createThread: (title: string) => Promise<string>;
  deleteThread: (threadId: string) => void;
  persistMessage: (threadId: string, message: UserMessage | AssistantMessage) => void;
}

const mapApiMessageToMessage = (apiMessage: ChatMessageResponse): Message => {
  if (apiMessage.role === 'User') {
    return {
      author: MessageAuthor.User,
      content: apiMessage.content,
      timestamp: new Date(apiMessage.createdAt),
      allowAppChanges: apiMessage.allowAppChanges ?? false,
    };
  }
  return {
    author: MessageAuthor.Assistant,
    content: apiMessage.content,
    timestamp: new Date(apiMessage.createdAt),
    filesChanged: apiMessage.filesChanged ?? [],
    sources: apiMessage.sources?.map((s) => ({
      tool: s.tool,
      title: s.title,
      previewText: s.previewText,
      contentLength: s.contentLength ?? undefined,
      url: s.url ?? undefined,
      relevance: s.relevance ?? undefined,
      matchedTerms: s.matchedTerms ?? undefined,
      cited: s.cited ?? undefined,
    })),
  };
};

export const useAltinityThreads = (): AltinityThreadState => {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);

  const {
    threads: apiThreads,
    addThread: createApiThread,
    deleteThread: deleteApiThread,
  } = useThreadStorage();

  const { data: apiMessages } = useChatMessagesQuery(currentSessionId);
  const { mutate: createChatMessage } = useCreateChatMessageMutation();

  const setCurrentSession = useCallback((sessionId: string | null) => {
    setCurrentSessionId(sessionId);
    currentSessionIdRef.current = sessionId;
  }, []);

  const persistedMessages: Message[] = useMemo(
    () => (apiMessages ?? []).map(mapApiMessageToMessage),
    [apiMessages],
  );

  const chatThreads: ChatThread[] = useMemo(
    () =>
      apiThreads.map((thread) => ({
        ...thread,
        messages: thread.id === currentSessionId ? persistedMessages : [],
      })),
    [apiThreads, currentSessionId, persistedMessages],
  );

  const selectThread = useCallback(
    (threadId: string | null) => {
      setCurrentSession(threadId);
    },
    [setCurrentSession],
  );

  const createNewThread = useCallback(() => {
    setCurrentSession(null);
  }, [setCurrentSession]);

  const createThread = useCallback(
    async (title: string): Promise<string> => {
      return createApiThread(title);
    },
    [createApiThread],
  );

  const deleteThread = useCallback(
    (threadId: string) => {
      deleteApiThread(threadId);
      if (currentSessionIdRef.current === threadId) {
        setCurrentSession(null);
      }
    },
    [deleteApiThread, setCurrentSession],
  );

  const persistMessage = useCallback(
    (threadId: string, message: UserMessage | AssistantMessage) => {
      const isUser = message.author === MessageAuthor.User;
      const assistantMessage = !isUser ? (message as AssistantMessage) : undefined;
      createChatMessage({
        threadId,
        payload: {
          role: message.author,
          content: message.content,
          allowAppChanges: isUser ? (message as UserMessage).allowAppChanges : undefined,
          attachmentFileNames: isUser
            ? ((message as UserMessage).attachments ?? []).map((a) => a.name)
            : undefined,
          filesChanged: assistantMessage?.filesChanged,
          sources: assistantMessage?.sources?.map((s) => ({
            tool: s.tool,
            title: s.title,
            previewText: s.previewText,
            contentLength: s.contentLength,
            url: s.url,
            relevance: s.relevance,
            matchedTerms: s.matchedTerms,
            cited: s.cited,
          })),
        },
      });
    },
    [createChatMessage],
  );

  return {
    chatThreads,
    currentSessionId,
    currentSessionIdRef,
    persistedMessages,
    setCurrentSession,
    selectThread,
    createNewThread,
    createThread,
    deleteThread,
    persistMessage,
  };
};
