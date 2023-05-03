import { useMutation } from '@tanstack/react-query';
import { IExternalFormLayout, IFormLayouts, IInternalLayout } from '../../types/global';
import { convertInternalToLayoutFormat } from '../../utils/formLayoutUtils';
import { QueryKey } from '../../types/QueryKey';
import { queryClient, useServicesContext } from '../../../../../app-development/common/ServiceContext';
import { usePreviewConnection } from 'app-shared/providers/PreviewConnectionContext';

export const useFormLayoutMutation = (org: string, app: string, layoutName: string) => {

  const previewConnection = usePreviewConnection();

  const { saveFormLayout } = useServicesContext();

  return useMutation({
    mutationFn: (layout: IInternalLayout) => {
      const convertedLayout: IExternalFormLayout = convertInternalToLayoutFormat(layout);
      return saveFormLayout(org, app, layoutName, convertedLayout).then(() => layout);
    },
    onSuccess: async (savedLayout) => {
      if (previewConnection && previewConnection.state === "Connected") {
        await previewConnection.send("sendMessage", "reload-layouts").catch(function (err) {
          return console.error(err.toString());
        });
      }

      queryClient.setQueryData(
        [QueryKey.FormLayouts, org, app],
        (oldData: IFormLayouts) => ({ ...oldData, [layoutName]: savedLayout })
      );
    }
  })
};
