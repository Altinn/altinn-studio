import { useQuery } from '@tanstack/react-query';
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

function mapChatMessageToFrontend(message: ChatMessage) {
  const base = {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
  };

  if (message.role === MessageAuthor.User) {
    return {
      ...base,
      allowAppChanges: message.allowAppChanges ?? false,
      attachments: message.attachmentFileNames?.map((name) => ({ name })) ?? [],
    };
  }

  return {
    ...base,
    filesChanged: message.filesChanged ?? undefined,
    sources: message.sources ?? undefined,
  };
}
