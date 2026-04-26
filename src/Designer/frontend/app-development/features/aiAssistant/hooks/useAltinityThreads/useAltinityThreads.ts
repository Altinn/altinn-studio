import { useState, useRef, useCallback, useMemo } from 'react';
import type { MutableRefObject } from 'react';
import type { ChatThread, UserMessage, AssistantMessage, Message } from '@studio/assistant';
import { MessageAuthor } from '@studio/assistant';
import { useChatThreadsQuery } from 'app-shared/hooks/queries/useChatThreadsQuery';
import { useCreateChatThreadMutation } from 'app-shared/hooks/mutations/useCreateChatThreadMutation';
import { useDeleteChatThreadMutation } from 'app-shared/hooks/mutations/useDeleteChatThreadMutation';
import { useChatMessagesQuery } from 'app-shared/hooks/queries/useChatMessagesQuery';
import { useCreateChatMessageMutation } from 'app-shared/hooks/mutations/useCreateChatMessageMutation';
import { useDeleteChatMessageMutation } from 'app-shared/hooks/mutations/useDeleteChatMessageMutation';

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
  deleteMessage: (threadId: string, messageId: string) => void;
  persistMessage: (threadId: string, message: UserMessage | AssistantMessage) => void;
}

export const useAltinityThreads = (): AltinityThreadState => {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);

  const { data: threadResponses } = useChatThreadsQuery();
  const { mutateAsync: createThreadMutation } = useCreateChatThreadMutation();
  const { mutate: deleteThreadMutation } = useDeleteChatThreadMutation();

  const chatThreads: ChatThread[] = useMemo(() => threadResponses ?? [], [threadResponses]);

  const { data: apiMessages } = useChatMessagesQuery(currentSessionId);
  const { mutate: createChatMessage } = useCreateChatMessageMutation();
  const { mutate: deleteChatMessage } = useDeleteChatMessageMutation();

  const setCurrentSession = useCallback((sessionId: string | null) => {
    setCurrentSessionId(sessionId);
    currentSessionIdRef.current = sessionId;
  }, []);

  const persistedMessages: Message[] = useMemo(() => apiMessages ?? [], [apiMessages]);

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
      const result = await createThreadMutation({ title });
      return result.id;
    },
    [createThreadMutation],
  );

  const deleteThread = useCallback(
    (threadId: string) => {
      deleteThreadMutation(threadId);
      if (currentSessionIdRef.current === threadId) {
        setCurrentSession(null);
      }
    },
    [deleteThreadMutation, setCurrentSession],
  );

  const persistMessage = useCallback(
    (threadId: string, message: UserMessage | AssistantMessage) => {
      const isUser = message.role === MessageAuthor.User;
      createChatMessage({
        threadId,
        payload: {
          role: message.role,
          content: message.content,
          allowAppChanges: isUser ? message.allowAppChanges : false,
          attachmentFileNames: isUser ? (message.attachments?.map((a) => a.name) ?? []) : [],
          filesChanged: isUser ? [] : message.filesChanged,
          sources: isUser ? null : (message.sources ?? null),
        },
      });
    },
    [createChatMessage],
  );

  const deleteMessage = useCallback(
    (threadId: string, messageId: string): void => {
      deleteChatMessage({ threadId, messageId });
    },
    [deleteChatMessage],
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
    deleteMessage,
    persistMessage,
  };
};
