import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { StringUtils } from '@studio/pure-functions';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export const useAddXsdMutation = () => {
  const { addXsdFromRepo } = useServicesContext();
  const queryClient = useQueryClient();
  const { org, app } = useStudioEnvironmentParams();

  return useMutation({
    mutationFn: (modelPath: string) =>
      addXsdFromRepo(org, app, StringUtils.removeStart(modelPath, '/')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.DataModelsJson, org, app] }).then();
      queryClient.invalidateQueries({ queryKey: [QueryKey.DataModelsXsd, org, app] }).then();
      queryClient.invalidateQueries({ queryKey: [QueryKey.JsonSchema, org, app] }).then();
    },
  });
};
