import { useQuery, type QueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { MessageAuthor } from 'app-shared/types/api';
import type { ChatMessage } from 'app-shared/types/api';

export const useChatMessagesQuery = (threadId: string | null) => {
  const { getChatMessages } = useServicesContext();
  const { org, app } = useStudioEnvironmentParams();
  return useQuery({
    queryKey: [QueryKey.ChatMessages, org, app, threadId],
    queryFn: () => getChatMessages(org, app, threadId!),
    select: (data: ChatMessage[]) => data.map(mapChatMessageToFrontend),
    enabled: !!threadId,
  });
};

// invalidateQueries does not restart the first fetch of a query. That fetch can read the thread before
// the latest change to its messages.
export async function refreshChatMessages(
  queryClient: QueryClient,
  org: string,
  app: string,
  threadId: string,
): Promise<void> {
  const queryKey = [QueryKey.ChatMessages, org, app, threadId];
  await queryClient.cancelQueries({ queryKey });
  await queryClient.invalidateQueries({ queryKey });
}

export function mapChatMessageToFrontend(message: ChatMessage) {
  const base = {
    id: message.id,
    content: message.content,
    createdAt: message.createdAt,
  };

  if (message.role === MessageAuthor.User) {
    return {
      ...base,
      role: MessageAuthor.User as const,
      allowAppChanges: message.allowAppChanges ?? false,
      attachments: message.attachmentFileNames?.map((name) => ({ name })) ?? [],
    };
  }

  return {
    ...base,
    role: MessageAuthor.Assistant as const,
    filesChanged: message.filesChanged,
    sources: message.sources,
    attachmentInstructionFlagged: message.attachmentInstructionFlagged,
    traceId: message.traceId,
    feedbackThumbsUp: message.feedbackThumbsUp ?? undefined,
  };
}
