import { useState, useRef, useCallback, useMemo } from 'react';
import type { MutableRefObject } from 'react';
import type { ChatThread, UserMessage, AssistantMessage, Message } from '@studio/assistant';
import { MessageAuthor } from '@studio/assistant';
import { useChatThreadsQuery } from '../queries/useChatThreadsQuery';
import { useCreateChatThreadMutation } from '../mutations/useCreateChatThreadMutation';
import { useDeleteChatThreadMutation } from '../mutations/useDeleteChatThreadMutation';
import { useChatMessagesQuery } from '../queries/useChatMessagesQuery';
import { useCreateChatMessageMutation } from '../mutations/useCreateChatMessageMutation';

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

export const useAltinityThreads = (): AltinityThreadState => {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);

  const { data: threadResponses } = useChatThreadsQuery();
  const { mutateAsync: createThreadMutation } = useCreateChatThreadMutation();
  const { mutate: deleteThreadMutation } = useDeleteChatThreadMutation();

  const chatThreads: ChatThread[] = useMemo(() => threadResponses ?? [], [threadResponses]);

  const { data: apiMessages } = useChatMessagesQuery(currentSessionId);
  const { mutate: createChatMessage } = useCreateChatMessageMutation();

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
        payload: isUser
          ? {
              role: message.role,
              content: message.content,
              allowAppChanges: message.allowAppChanges,
              attachmentFileNames: message.attachments?.map((a) => a.name),
            }
          : {
              role: message.role,
              content: message.content,
              filesChanged: message.filesChanged,
              sources: message.sources,
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
