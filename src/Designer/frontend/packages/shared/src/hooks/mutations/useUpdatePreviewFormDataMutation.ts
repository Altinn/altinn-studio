import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export type UpdatePreviewFormDataArgs = {
  dataElementId: string;
  data: object;
};

/** Replaces the data of a form data element of an instance in preview. */
export const useUpdatePreviewFormDataMutation = (
  org: string,
  app: string,
  sessionUrl: string,
  instanceId: string,
) => {
  const { updatePreviewFormData } = useServicesContext();
  return useMutation({
    mutationFn: ({ dataElementId, data }: UpdatePreviewFormDataArgs) =>
      updatePreviewFormData(org, app, sessionUrl, instanceId, dataElementId, data),
  });
};
