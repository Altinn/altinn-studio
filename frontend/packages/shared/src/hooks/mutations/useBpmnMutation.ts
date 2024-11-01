import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';
import { toast } from 'react-toastify';

type UseBpmnMutationPayload = {
  form: FormData;
};

export const useBpmnMutation = (org: string, app: string) => {
  const { updateBpmnXml } = useServicesContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ form }: UseBpmnMutationPayload) =>
      updateBpmnXml(org, app, form).catch((error) => {
        toast.error('useBpmnMutation --- ', error);

        return error;
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [QueryKey.FetchBpmn, org, app] });
    },
  });
};
