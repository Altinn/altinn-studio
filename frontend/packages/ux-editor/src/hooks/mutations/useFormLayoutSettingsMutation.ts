import { useMutation } from '@tanstack/react-query';
import { ILayoutSettings } from 'app-shared/types/global';
import { queryClient, useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { usePreviewConnection } from 'app-shared/providers/PreviewConnectionContext';

export const useFormLayoutSettingsMutation = (org: string, app: string, layoutSetName: string) => {
  const previewConnection = usePreviewConnection();
  const { saveFormLayoutSettings } = useServicesContext();
  return useMutation({
    mutationFn: (settings: ILayoutSettings) => saveFormLayoutSettings(org, app, layoutSetName, settings).then(() => settings),
    onSuccess: async (savedSettings) => {
      if (previewConnection && previewConnection.state === "Connected") {
        await previewConnection.send("sendMessage", "reload-layouts").catch(function (err) {
          return console.error(err.toString());
        });
      }

      queryClient.setQueryData(
        [QueryKey.FormLayoutSettings, org, app, layoutSetName],
        savedSettings
      );
    }
  });
}
