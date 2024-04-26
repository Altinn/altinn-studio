import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProcessDataType } from 'app-shared/api/mutations';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { MetaDataForm } from 'app-shared/types/BpmnMetaDataForm';

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
