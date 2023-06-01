import { useMutation } from '@tanstack/react-query';
import { IFormLayouts, IInternalLayout } from '../../types/global';
import { convertInternalToLayoutFormat } from '../../utils/formLayoutUtils';
import { QueryKey } from 'app-shared/types/QueryKey';
import { queryClient, useServicesContext } from 'app-shared/contexts/ServicesContext';
import { usePreviewConnection } from 'app-shared/providers/PreviewConnectionContext';
import { ExternalFormLayout } from 'app-shared/types/api/FormLayoutsResponse';

export const useFormLayoutMutation = (org: string, app: string, layoutName: string, layoutSetName: string) => {

  const previewConnection = usePreviewConnection();
  const { saveFormLayout } = useServicesContext();

  return useMutation({
    mutationFn: (layout: IInternalLayout) => {
      const convertedLayout: ExternalFormLayout = convertInternalToLayoutFormat(layout);
      return saveFormLayout(org, app, layoutName, layoutSetName, convertedLayout).then(() => layout)
    },
    onSuccess: async (savedLayout) => {
      if (previewConnection && previewConnection.state === "Connected") {
        await previewConnection.send("sendMessage", "reload-layouts").catch(function (err) {
          return console.error(err.toString());
        });
      }

      queryClient.setQueryData(
        [QueryKey.FormLayouts, org, app, layoutSetName],
        (oldData: IFormLayouts) => ({ ...oldData, [layoutName]: savedLayout })
      );
    }
  })
};
