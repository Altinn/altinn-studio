import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { TaskNavigationGroup } from 'app-shared/types/api/dto/TaskNavigationGroup';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useTaskNavigationGroupMutation = (org: string, app: string) => {
  const { updateTaskNavigationGroup } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: TaskNavigationGroup[]) => updateTaskNavigationGroup(org, app, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.TaskNavigationGroup, org, app] });
    },
  });
};
