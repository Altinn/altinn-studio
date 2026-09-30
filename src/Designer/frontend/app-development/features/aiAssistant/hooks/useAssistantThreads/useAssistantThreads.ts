import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ChatThread, UserMessage, AssistantMessage, Message } from '@studio/assistant';
import { MessageAuthor } from '@studio/assistant';
import type { ChatMessage } from 'app-shared/types/api';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useChatThreadsQuery } from 'app-shared/hooks/queries/useChatThreadsQuery';
import { useCreateChatThreadMutation } from 'app-shared/hooks/mutations/useCreateChatThreadMutation';
import { useDeleteChatThreadMutation } from 'app-shared/hooks/mutations/useDeleteChatThreadMutation';
import { useChatMessagesQuery } from 'app-shared/hooks/queries/useChatMessagesQuery';
import { useCreateChatMessageMutation } from 'app-shared/hooks/mutations/useCreateChatMessageMutation';
import { useDeleteChatMessageMutation } from 'app-shared/hooks/mutations/useDeleteChatMessageMutation';

export interface AssistantThreadState {
  chatThreads: ChatThread[];
  selectedThreadId: string | null;
  chatMessages: Message[];
  selectThread: (threadId: string | null) => void;
  createThread: (title: string) => Promise<string>;
  deleteThread: (threadId: string) => void;
  deleteMessage: (threadId: string, messageId: string) => Promise<void>;
  createMessage: (
    threadId: string,
    message: UserMessage | AssistantMessage,
  ) => Promise<ChatMessage>;
  refreshMessages: (threadId: string) => void;
}

export const useAssistantThreads = (): AssistantThreadState => {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { org, app } = useStudioEnvironmentParams();

  const { data: chatThreads } = useChatThreadsQuery();
  const { mutateAsync: createChatThread } = useCreateChatThreadMutation();
  const { mutate: deleteChatThread } = useDeleteChatThreadMutation();

  const { data: chatMessages } = useChatMessagesQuery(selectedThreadId);
  const { mutateAsync: createChatMessage } = useCreateChatMessageMutation();
  const { mutateAsync: deleteChatMessage } = useDeleteChatMessageMutation();

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
          if (selectedThreadId === threadId) {
            setSelectedThreadId(null);
          }
        },
      });
    },
    [deleteChatThread, selectedThreadId],
  );

  const createMessage = useCallback(
    (threadId: string, message: UserMessage | AssistantMessage): Promise<ChatMessage> => {
      const isUser = message.role === MessageAuthor.User;
      return createChatMessage({
        threadId,
        payload: {
          role: message.role,
          content: message.content,
          allowAppChanges: isUser ? message.allowAppChanges : undefined,
          attachmentFileNames: isUser ? message.attachments?.map((a) => a.name) : undefined,
          filesChanged: isUser ? undefined : message.filesChanged,
          sources: isUser ? undefined : message.sources,
          attachmentInstructionFlagged: isUser ? undefined : message.attachmentInstructionFlagged,
          traceId: isUser ? undefined : message.traceId,
        },
      });
    },
    [createChatMessage],
  );

  const deleteMessage = useCallback(
    async (threadId: string, messageId: string): Promise<void> => {
      await deleteChatMessage({ threadId, messageId });
    },
    [deleteChatMessage],
  );

  // Pulls a server-persisted message into the cache — the render path for
  // assistant messages the backend already stored (persistedMessageId set).
  const refreshMessages = useCallback(
    (threadId: string): void => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ChatMessages, org, app, threadId] });
    },
    [queryClient, org, app],
  );

  return {
    chatThreads: chatThreads ?? [],
    chatMessages: chatMessages ?? [],
    selectedThreadId,
    selectThread: setSelectedThreadId,
    createThread,
    deleteThread,
    deleteMessage,
    createMessage,
    refreshMessages,
  };
};
