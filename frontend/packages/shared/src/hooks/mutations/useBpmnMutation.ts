import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';

type UseBpmnMutationPayload = {
  form: FormData;
};

export const useBpmnMutation = (org: string, app: string, resetQueries: boolean = false) => {
  const { updateBpmnXml } = useServicesContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ form }: UseBpmnMutationPayload) => updateBpmnXml(org, app, form),
    onSuccess: async () => {
      const queryKey = [QueryKey.FetchBpmn, org, app];
      resetQueries
        ? await queryClient.resetQueries({ queryKey })
        : await queryClient.invalidateQueries({ queryKey });
    },
  });
};
