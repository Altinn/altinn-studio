import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { Message } from '@studio/assistant';

export const useChatMessagesQuery = (threadId: string | null) => {
  const { getChatMessages } = useServicesContext();
  const { org, app } = useStudioEnvironmentParams();
  return useQuery<Message[]>({
    queryKey: [QueryKey.ChatMessages, org, app, threadId],
    queryFn: () => getChatMessages(org, app, threadId!),
    enabled: !!threadId,
  });
};
