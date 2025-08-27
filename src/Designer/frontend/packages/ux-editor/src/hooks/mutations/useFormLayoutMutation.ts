import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { IInternalLayout } from '../../types/global';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { usePreviewConnection } from 'app-shared/providers/PreviewConnectionContext';
import type { ExternalFormLayout } from 'app-shared/types/api/FormLayoutsResponse';
import { internalLayoutToExternal } from '../../converters/formLayoutConverters';
import type { ComponentIdsChange, FormLayoutRequest } from 'app-shared/types/api/FormLayoutRequest';

type useFormLayoutMutationPayload = {
  internalLayout: IInternalLayout;
  componentIdsChange?: ComponentIdsChange;
};

export const useFormLayoutMutation = (
  org: string,
  app: string,
  layoutName: string,
  layoutSetName: string,
) => {
  const previewConnection = usePreviewConnection();
  const { saveFormLayout } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: useFormLayoutMutationPayload) => {
      const convertedLayout: ExternalFormLayout = internalLayoutToExternal(payload.internalLayout);
      const requestPayload: FormLayoutRequest = {
        layout: convertedLayout,
        componentIdsChange: payload.componentIdsChange,
      };
      await saveFormLayout(org, app, layoutName, layoutSetName, requestPayload);
      return payload.internalLayout;
    },
    onSuccess: async () => {
      if (previewConnection && previewConnection.state === 'Connected') {
        await previewConnection.send('sendMessage', 'reload-layouts').catch(function (err) {
          return console.error(err.toString());
        });
      }

      queryClient.invalidateQueries({ queryKey: [QueryKey.FormLayouts, org, app, layoutSetName] });
    },
  });
};
