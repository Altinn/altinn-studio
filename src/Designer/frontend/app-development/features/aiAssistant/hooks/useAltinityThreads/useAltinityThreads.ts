import { useState, useRef, useCallback } from 'react';
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
  chatMessages: Message[];
  setCurrentSession: (sessionId: string | null) => void;
  selectThread: (threadId: string | null) => void;
  createThread: (title: string) => Promise<string>;
  deleteThread: (threadId: string) => void;
  deleteMessage: (threadId: string, messageId: string) => void;
  createMessage: (threadId: string, message: UserMessage | AssistantMessage) => void;
}

export const useAltinityThreads = (): AltinityThreadState => {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);

  const { data: chatThreads } = useChatThreadsQuery();
  const { mutateAsync: createChatThread } = useCreateChatThreadMutation();
  const { mutate: deleteChatThread } = useDeleteChatThreadMutation();

  const { data: chatMessages } = useChatMessagesQuery(currentSessionId);
  const { mutate: createChatMessage } = useCreateChatMessageMutation();
  const { mutate: deleteChatMessage } = useDeleteChatMessageMutation();

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

  const createThread = useCallback(
    async (title: string): Promise<string> => {
      const result = await createChatThread({ title });
      return result.id;
    },
    [createChatThread],
  );

  const deleteThread = useCallback(
    (threadId: string) => {
      deleteChatThread(threadId, {
        onSuccess: () => {
          if (currentSessionIdRef.current === threadId) {
            setCurrentSession(null);
          }
        },
      });
    },
    [deleteChatThread, setCurrentSession],
  );

  const createMessage = useCallback(
    (threadId: string, message: UserMessage | AssistantMessage) => {
      const isUser = message.role === MessageAuthor.User;
      createChatMessage({
        threadId,
        payload: {
          role: message.role,
          content: message.content,
          allowAppChanges: isUser ? message.allowAppChanges : undefined,
          attachmentFileNames: isUser ? message.attachments?.map((a) => a.name) : undefined,
          filesChanged: isUser ? undefined : message.filesChanged,
          sources: isUser ? undefined : message.sources,
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
    chatThreads: chatThreads ?? [],
    chatMessages: chatMessages ?? [],
    currentSessionId,
    currentSessionIdRef,
    setCurrentSession,
    selectThread,
    createThread,
    deleteThread,
    deleteMessage,
    createMessage,
  };
};
