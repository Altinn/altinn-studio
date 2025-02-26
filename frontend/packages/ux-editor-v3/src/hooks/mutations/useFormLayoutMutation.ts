import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { IFormLayouts, IInternalLayout } from '../../types/global';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { usePreviewConnection } from 'app-shared/providers/PreviewConnectionContext';
import type { ExternalFormLayoutV3 } from 'app-shared/types/api/FormLayoutsResponseV3';
import { useAppContext } from '../useAppContext';
import { internalLayoutToExternal } from '../../converters/formLayoutConverters';
import type { FormLayoutRequest } from 'app-shared/types/api/FormLayoutRequest';

export const useFormLayoutMutation = (
  org: string,
  app: string,
  layoutName: string,
  layoutSetName: string,
) => {
  const previewConnection = usePreviewConnection();
  const { saveFormLayoutV3 } = useServicesContext();
  const queryClient = useQueryClient();
  const { previewIframeRef } = useAppContext();

  return useMutation({
    mutationFn: (layout: IInternalLayout) => {
      const convertedLayout: ExternalFormLayoutV3 = internalLayoutToExternal(layout);

      const requestPayload = {
        layout: convertedLayout,
      } as unknown as FormLayoutRequest;

      return saveFormLayoutV3(org, app, layoutName, layoutSetName, requestPayload).then(
        () => layout,
      );
    },
    onSuccess: async (savedLayout) => {
      if (previewConnection && previewConnection.state === 'Connected') {
        await previewConnection.send('sendMessage', 'reload-layouts').catch(function (err) {
          return console.error(err.toString());
        });
      }

      previewIframeRef.current?.contentWindow.location.reload();

      queryClient.setQueryData(
        [QueryKey.FormLayouts, org, app, layoutSetName],
        (oldData: IFormLayouts) => ({ ...oldData, [layoutName]: savedLayout }),
      );
    },
  });
};
