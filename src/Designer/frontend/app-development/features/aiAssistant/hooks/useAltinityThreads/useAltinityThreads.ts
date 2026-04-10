import { useState, useRef, useCallback, useMemo } from 'react';
import type { MutableRefObject } from 'react';
import type {
  ChatThread,
  UserMessage,
  AssistantMessage,
  AssistantMessageData,
  Message,
} from '@studio/assistant';
import { MessageAuthor } from '@studio/assistant';
import { useThreadStorage } from '../useThreadStorage/useThreadStorage';
import { useChatMessagesQuery } from '../queries/useChatMessagesQuery';
import { useCreateChatMessageMutation } from '../mutations/useCreateChatMessageMutation';
import { isLastLoadingAssistantMessage } from '../../utils/messageUtils';
import type { ChatMessageResponse } from '../../types/api';

export interface AltinityThreadState {
  chatThreads: ChatThread[];
  currentSessionId: string | null;
  currentSessionIdRef: MutableRefObject<string | null>;
  setCurrentSession: (sessionId: string | null) => void;
  selectThread: (threadId: string | null) => void;
  createNewThread: () => void;
  createThread: (title: string) => Promise<string>;
  deleteThread: (threadId: string) => void;
  addMessageToThread: (threadId: string, message: UserMessage | AssistantMessage) => void;
  removeLoadingMessage: (threadId: string) => void;
  replaceLoadingWithMessage: (threadId: string, message: AssistantMessage) => void;
  removeCancelledMessages: (threadId: string) => string | null;
  upsertAssistantMessage: (
    sessionId: string,
    assistantMessage: AssistantMessageData,
    content: string,
    timestamp: Date,
  ) => void;
  updateWorkflowStatusMessage: (sessionId: string, statusMessage: string) => void;
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
  const [localMessages, setLocalMessages] = useState<Record<string, Message[]>>({});
  const localMessagesRef = useRef<Record<string, Message[]>>({});

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

  const getLocalMessages = useCallback((threadId: string): Message[] => {
    return localMessagesRef.current[threadId] ?? [];
  }, []);

  const setLocalMessagesForThread = useCallback((threadId: string, messages: Message[]) => {
    localMessagesRef.current = { ...localMessagesRef.current, [threadId]: messages };
    setLocalMessages((prev) => ({ ...prev, [threadId]: messages }));
  }, []);

  const persistedMessages: Message[] = useMemo(
    () => (apiMessages ?? []).map(mapApiMessageToMessage),
    [apiMessages],
  );
  const persistedMessagesRef = useRef<Message[]>(persistedMessages);
  persistedMessagesRef.current = persistedMessages;

  const chatThreads: ChatThread[] = useMemo(() => {
    return apiThreads.map((thread) => {
      const isCurrentThread = thread.id === currentSessionId;
      const messagesFromApi = isCurrentThread ? persistedMessages : [];
      const messagesFromLocal = localMessages[thread.id] ?? [];
      return {
        ...thread,
        messages: [...messagesFromApi, ...messagesFromLocal],
      };
    });
  }, [apiThreads, currentSessionId, persistedMessages, localMessages]);

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
      const updatedRef = { ...localMessagesRef.current };
      delete updatedRef[threadId];
      localMessagesRef.current = updatedRef;
      setLocalMessages((prev) => {
        const next = { ...prev };
        delete next[threadId];
        return next;
      });
      if (currentSessionIdRef.current === threadId) {
        setCurrentSession(null);
      }
    },
    [deleteApiThread, setCurrentSession],
  );

  const persistMessageToApi = useCallback(
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

  const addMessageToThread = useCallback(
    (threadId: string, message: UserMessage | AssistantMessage) => {
      if (message.author === MessageAuthor.User) {
        persistMessageToApi(threadId, message);
      } else {
        const currentLocal = getLocalMessages(threadId);
        setLocalMessagesForThread(threadId, [...currentLocal, message]);
      }
    },
    [persistMessageToApi, getLocalMessages, setLocalMessagesForThread],
  );

  const removeCancelledMessages = useCallback(
    (threadId: string): string | null => {
      const localMsgs = getLocalMessages(threadId);
      const filteredLocal = localMsgs.filter(
        (msg, index, arr) => !isLastLoadingAssistantMessage(msg, index, arr),
      );
      setLocalMessagesForThread(threadId, filteredLocal);

      const allMessages = [...persistedMessagesRef.current, ...localMsgs];
      const lastUserMessage = allMessages.findLast((msg) => msg.author === MessageAuthor.User);
      return lastUserMessage?.content ?? null;
    },
    [getLocalMessages, setLocalMessagesForThread],
  );

  const removeLoadingMessage = useCallback(
    (threadId: string) => {
      const localMsgs = getLocalMessages(threadId);
      const filtered = localMsgs.filter(
        (msg, index, arr) => !isLastLoadingAssistantMessage(msg, index, arr),
      );
      setLocalMessagesForThread(threadId, filtered);
    },
    [getLocalMessages, setLocalMessagesForThread],
  );

  const replaceLoadingWithMessage = useCallback(
    (threadId: string, message: AssistantMessage) => {
      if (!message.isLoading) {
        persistMessageToApi(threadId, message);
        setLocalMessagesForThread(threadId, []);
      } else {
        const localMsgs = getLocalMessages(threadId);
        const withoutLoading = localMsgs.filter(
          (msg, index, arr) => !isLastLoadingAssistantMessage(msg, index, arr),
        );
        setLocalMessagesForThread(threadId, [...withoutLoading, message]);
      }
    },
    [getLocalMessages, setLocalMessagesForThread, persistMessageToApi],
  );

  const upsertAssistantMessage = useCallback(
    (
      sessionId: string,
      assistantMessage: AssistantMessageData,
      content: string,
      timestamp: Date,
    ) => {
      const assistantUpdate: AssistantMessage = {
        author: MessageAuthor.Assistant,
        content,
        timestamp,
        filesChanged: assistantMessage.filesChanged || [],
        sources: assistantMessage.sources || [],
        isLoading: false,
      };

      persistMessageToApi(sessionId, assistantUpdate);
      setLocalMessagesForThread(sessionId, []);
    },
    [persistMessageToApi, setLocalMessagesForThread],
  );

  const updateWorkflowStatusMessage = useCallback(
    (sessionId: string, statusMessage: string) => {
      const localMsgs = getLocalMessages(sessionId);
      const updatedMessages = localMsgs.map((msg, index) => {
        if (msg.author === MessageAuthor.Assistant && index === localMsgs.length - 1) {
          return { ...msg, content: statusMessage };
        }
        return msg;
      });
      setLocalMessagesForThread(sessionId, updatedMessages);
    },
    [getLocalMessages, setLocalMessagesForThread],
  );

  return {
    chatThreads,
    currentSessionId,
    currentSessionIdRef,
    setCurrentSession,
    selectThread,
    createNewThread,
    createThread,
    deleteThread,
    addMessageToThread,
    removeLoadingMessage,
    replaceLoadingWithMessage,
    removeCancelledMessages,
    upsertAssistantMessage,
    updateWorkflowStatusMessage,
  };
};
