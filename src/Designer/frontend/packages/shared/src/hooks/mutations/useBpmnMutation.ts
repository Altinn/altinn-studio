import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';
import type { MetadataForm } from '../../types/BpmnMetadataForm';

type UseBpmnMutationPayload = {
  form: FormData;
  metadata?: MetadataForm;
};

export const useBpmnMutation = (org: string, app: string) => {
  const { updateBpmnXml } = useServicesContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ form }: UseBpmnMutationPayload) => updateBpmnXml(org, app, form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [QueryKey.FetchBpmn, org, app] });
      await queryClient.invalidateQueries({ queryKey: [QueryKey.AppValidation, org, app] });
    },
    onSettled: async (_data, error, { metadata }) => {
      const taskId = metadata?.subformPdfComponentChange?.taskId;
      if (error && !taskId) return;
      // Refresh subform state after task renames and component changes. Refresh even after a failed save
      // because some files may already have changed.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [QueryKey.LayoutSets, org, app] }),
        queryClient.invalidateQueries({ queryKey: [QueryKey.LayoutSetsExtended, org, app] }),
        ...(taskId
          ? [
              queryClient.invalidateQueries({ queryKey: [QueryKey.SubformComponents, org, app] }),
              queryClient.invalidateQueries({ queryKey: [QueryKey.FormLayouts, org, app, taskId] }),
            ]
          : []),
      ]);
    },
  });
};
