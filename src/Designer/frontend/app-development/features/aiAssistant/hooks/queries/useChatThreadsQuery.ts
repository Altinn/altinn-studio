import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { ChatThread } from '@studio/assistant';

export const useChatThreadsQuery = () => {
  const { getChatThreads } = useServicesContext();
  const { org, app } = useStudioEnvironmentParams();
  return useQuery<ChatThread[]>({
    queryKey: [QueryKey.ChatThreads, org, app],
    queryFn: () => getChatThreads(org, app),
  });
};
