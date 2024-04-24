import { type MetaDataForm } from '@altinn/process-editor/src/contexts/BpmnConfigPanelContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProcessDataType } from 'app-shared/api/mutations';
import { QueryKey } from 'app-shared/types/QueryKey';

type useUpdateProcessDataTypeMutationPayload = {
  form: MetaDataForm;
};

export const useUpdateProcessDataTypeMutation = (org: string, app: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ form }: useUpdateProcessDataTypeMutationPayload) =>
      updateProcessDataType(org, app, form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [QueryKey.AppMetadataModelIds, org, app] });
      await queryClient.invalidateQueries({ queryKey: [QueryKey.LayoutSets, org, app] });
    },
  });
};
