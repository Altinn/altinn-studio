import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateBpmnXml } from 'app-shared/api/queries';
import { QueryKey } from 'app-shared/types/QueryKey';

type UseBpmnMutationPayload = {
  bpmnXml: string;
};

export const useBpmnMutation = (org: string, app: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bpmnXml }: UseBpmnMutationPayload) =>
      updateBpmnXml(org, app, bpmnXml).then(() => bpmnXml),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [QueryKey.FetchBpmn, org, app] });
    },
  });
};
