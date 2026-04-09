import { useCallback, useMemo } from 'react';
import type { ChatThread } from '@studio/assistant';
import { useChatThreadsQuery } from '../queries/useChatThreadsQuery';
import { useCreateChatThreadMutation } from '../mutations/useCreateChatThreadMutation';
import { useUpdateChatThreadMutation } from '../mutations/useUpdateChatThreadMutation';
import { useDeleteChatThreadMutation } from '../mutations/useDeleteChatThreadMutation';
import type { ChatThreadResponse } from '../../types/api';

const mapThreadResponseToChatThread = (response: ChatThreadResponse): ChatThread => ({
  id: response.id,
  title: response.title,
  messages: [],
  createdAt: response.createdAt,
  updatedAt: response.createdAt,
});

export const useThreadStorage = () => {
  const { data: threadResponses, isLoading } = useChatThreadsQuery();
  const { mutateAsync: createThread } = useCreateChatThreadMutation();
  const { mutate: updateThreadMutate } = useUpdateChatThreadMutation();
  const { mutate: deleteThreadMutate } = useDeleteChatThreadMutation();

  const threads: ChatThread[] = useMemo(
    () => (threadResponses ?? []).map(mapThreadResponseToChatThread),
    [threadResponses],
  );

  const addThread = useCallback(
    async (title: string): Promise<string> => {
      const result = await createThread({ title });
      return result.id;
    },
    [createThread],
  );

  const updateThread = useCallback(
    (threadId: string, title: string) => {
      updateThreadMutate({ threadId, title });
    },
    [updateThreadMutate],
  );

  const deleteThread = useCallback(
    (threadId: string) => {
      deleteThreadMutate(threadId);
    },
    [deleteThreadMutate],
  );

  const getThread = useCallback(
    (threadId: string): ChatThread | undefined => {
      return threads.find((thread) => thread.id === threadId);
    },
    [threads],
  );

  return {
    threads,
    isLoading,
    addThread,
    updateThread,
    deleteThread,
    getThread,
  };
};
