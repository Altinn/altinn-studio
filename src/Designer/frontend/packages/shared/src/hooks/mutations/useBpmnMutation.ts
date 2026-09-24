import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';

type UseBpmnMutationPayload = {
  form: FormData;
};

export const useBpmnMutation = (org: string, app: string) => {
  const { updateBpmnXml } = useServicesContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ form }: UseBpmnMutationPayload) => updateBpmnXml(org, app, form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [QueryKey.FetchBpmn, org, app] });
      await queryClient.invalidateQueries({ queryKey: [QueryKey.AppValidation, org, app] });
      // In v9 a task id change renames the task's layout set folder.
      await queryClient.invalidateQueries({ queryKey: [QueryKey.LayoutSets, org, app] });
      await queryClient.invalidateQueries({ queryKey: [QueryKey.LayoutSetsExtended, org, app] });
    },
  });
};
